import json, base64, requests
from django.conf import settings
from django.urls import reverse
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from .models import Booking, MpesaPayment

@login_required
def book_session(request):
    """Render the booking + payment page."""
    return render(request, 'booking/book.html')


@require_POST
@login_required
def pay_booking(request):
    """
    1) Create Booking (unconfirmed)
    2) Get OAuth token
    3) STK Push
    4) Record MpesaPayment
    """
    data = json.loads(request.body)
    # 1) create booking
    booking = Booking.objects.create(
        user=request.user,
        date=data['date'],
        time=data['time'],
        note=data.get('note', '')
    )

    # 2) OAuth token
    creds = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
    b64   = base64.b64encode(creds.encode()).decode()
    token_url = f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    tok_res = requests.get(token_url, headers={"Authorization": f"Basic {b64}"})
    tok_data = tok_res.json()
    access_token = tok_data.get("access_token")
    if not access_token:
        return JsonResponse({"success":False, "error":"OAuth token error"}, status=400)

    # 3) STK Push
    shortcode = settings.MPESA_SHORTCODE
    passkey   = settings.MPESA_PASSKEY
    ts        = timezone.now().strftime("%Y%m%d%H%M%S")
    password  = base64.b64encode(f"{shortcode}{passkey}{ts}".encode()).decode()
    stk_url   = f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
    callback_url = request.build_absolute_uri(reverse('booking:mpesa_callback_api'))

    payload = {
      "BusinessShortCode": shortcode,
      "Password":          password,
      "Timestamp":         ts,
      "TransactionType":   "CustomerPayBillOnline",
      "Amount":            1,
      "PartyA":            data['phone_number'],
      "PartyB":            shortcode,
      "PhoneNumber":       data['phone_number'],
      "CallBackURL":       callback_url,
      "AccountReference":  f"SAW{ts}"[:11],
      "TransactionDesc":   "Sawacom session booking"
    }

    print(payload)

    stk_res  = requests.post(
        stk_url,
        json=payload,
        headers={
          "Authorization": f"Bearer {access_token}",
          "Content-Type":  "application/json"
        }
    )
    stk_data = stk_res.json()
    if "errorCode" in stk_data:
        return JsonResponse({
            "success": False,
            "error": stk_data.get("errorMessage")
        }, status=400)

    response_code = stk_data.get("ResponseCode")
    if response_code != "0":
        return JsonResponse({
            "success": False,
            "error": stk_data.get("ResponseDescription")
        }, status=400)

    # 4) record
    mp = MpesaPayment.objects.create(
        booking             = booking,
        checkout_request_id = stk_data["CheckoutRequestID"],
        merchant_request_id = stk_data["MerchantRequestID"],
        amount              = payload["Amount"],
        phone_number        = data["phone_number"]
    )

    return JsonResponse({
      "success": True,
      "checkout_request_id": mp.checkout_request_id
    })


@login_required
def payment_status_api(request):
    """
    Poll this with ?checkout_request_id=...  
    Returns status = pending / success / failed
    """
    cid = request.GET.get("checkout_request_id")
    if not cid:
        return JsonResponse({"success":False, "error":"Missing ID"}, status=400)

    try:
        mp = MpesaPayment.objects.get(checkout_request_id=cid)
    except MpesaPayment.DoesNotExist:
        return JsonResponse({"success":False, "error":"Invalid ID"}, status=404)

    if mp.result_code is None:
        return JsonResponse({"status":"pending"})
    if mp.result_code == 0:
        # mark booking confirmed
        b = mp.booking
        b.confirmed = True
        b.save(update_fields=["confirmed"])
        return JsonResponse({"status":"success"})
    return JsonResponse({"status":"failed","error":mp.result_desc})


@csrf_exempt
@require_POST
def mpesa_callback_api(request):
    """
    This endpoint is called by Safaricom after user enters PIN.
    """
    body     = json.loads(request.body)
    stk_cb   = body.get("Body", {}).get("stkCallback", {})
    cid      = stk_cb.get("CheckoutRequestID")
    mreq     = stk_cb.get("MerchantRequestID")
    code     = stk_cb.get("ResultCode")
    desc     = stk_cb.get("ResultDesc")

    try:
        mp = MpesaPayment.objects.get(checkout_request_id=cid)
    except MpesaPayment.DoesNotExist:
        return JsonResponse({"ResultCode":1,"ResultDesc":"Booking not found"})

    mp.merchant_request_id = mreq
    mp.result_code         = code
    mp.result_desc         = desc
    mp.save()

    # Safaricom expects a JSON ack with ResultCode 0
    return JsonResponse({"ResultCode":0,"ResultDesc":"Accepted"})
