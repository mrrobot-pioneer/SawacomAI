"""
M-Pesa helper functions.

WHY?
• keep views thin
• allow easy unit-testing / reuse
"""

from __future__ import annotations
import base64
import time
from typing import Any, Dict
import requests
from django.conf import settings
from django.utils import timezone


def get_mpesa_token() -> str | None:
    """Fetch OAuth token (str), or None on failure."""
    creds = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
    b64   = base64.b64encode(creds.encode()).decode()
    url   = f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    try:
        r = requests.get(url, headers={"Authorization": f"Basic {b64}"}, timeout=10)
        return r.json().get("access_token")
    except requests.RequestException:
        return None


def mpesa_password(timestamp: str) -> str:
    """Encoded (Shortcode + Passkey + Timestamp)."""
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def stk_push(
    phone: str,
    amount: int,
    callback_url: str,
) -> Dict[str, Any]:
    """
    Fire STK Push.
    Returns raw JSON from Safaricom, or {"error": "..."} on fatal failure.
    """
    ts  = timezone.now().strftime("%Y%m%d%H%M%S")
    pwd = mpesa_password(ts)
    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password":          pwd,
        "Timestamp":         ts,
        "TransactionType":   "CustomerPayBillOnline",
        "Amount":            amount,
        "PartyA":            phone,
        "PartyB":            settings.MPESA_SHORTCODE,
        "PhoneNumber":       phone,
        "CallBackURL":       callback_url,
        "AccountReference":  f"SAW{ts}"[:11],
        "TransactionDesc":   "Sawacom session booking",
    }

    token = get_mpesa_token()
    if token is None:
        return {"error": "OAuth token error"}

    try:
        r = requests.post(
            f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
            },
            timeout=30,
        )
        return r.json()
    except requests.RequestException:
        return {"error": "Safaricom network error"}


# Small helper for SSE loops
def wait_for_payment(checkout_id: str, max_sec: int = 180, poll_sec: int = 2):
    """
    Generator for Server-Sent Events:
    yields dict once result_code is set or timeout hits.
    """
    from .models import MpesaPayment  # local import to avoid circular deps

    start = time.time()
    while True:
        try:
            mp = MpesaPayment.objects.only("result_code", "result_desc").get(checkout_request_id=checkout_id)
        except MpesaPayment.DoesNotExist:
            yield {"code": -1, "desc": "Invalid payment reference"}
            break

        if mp.result_code is not None:
            yield {"code": mp.result_code, "desc": mp.result_desc}
            break

        if time.time() - start > max_sec:
            yield {"code": -2, "desc": "Still waiting for payment confirmation. If you've already paid, please refresh or try again later."}
            break

        time.sleep(poll_sec)
