import json, base64, requests, time
from django.conf import settings
from django.urls import reverse
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib     import messages
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response    import Response
from rest_framework             import status

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
    callback_url = request.build_absolute_uri(reverse('booking:mpesa_callback'))

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

    try:
        stk_res  = requests.post(
            stk_url,
            json=payload,
            headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json"
            },
            timeout=30
        )    
    except requests.exceptions.Timeout:
        return JsonResponse({"success": False, "error": "M-Pesa is not responding. Try again later."}, status=504)
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
        phone_number        = data["phone_number"],
    )

    return JsonResponse({
      "success": True,
      "checkout_request_id": mp.checkout_request_id
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """
    POST: Safaricom STK-Push webhook → update payment & booking
    GET : Browser long-poll → wait for result_code, then redirect with Django messages
    """

    # --- 1) Safaricom webhook (no auth) ---
    # if request.method == 'POST':
    body = request.data.get("Body", {})
    cb   = body.get("stkCallback", {})
    cid  = cb.get("CheckoutRequestID")
    code = int(cb.get("ResultCode", -1))
    desc = cb.get("ResultDesc")

    print(cb,cid,code,desc)

    try:
        mp = MpesaPayment.objects.get(checkout_request_id=cid)
        print(mp)
    except MpesaPayment.DoesNotExist:
        # Safaricom expects a JSON with ResultCode != 0 on error
        return Response({"ResultCode": 1, "ResultDesc": "Booking not found"},
                        status=status.HTTP_200_OK)

    # update payment record
    mp.result_code = code
    mp.result_desc = desc
    mp.save()

    # confirm booking if successful
    if code == 0:
        b = mp.booking
        b.confirmed = True
        b.save(update_fields=['confirmed'])

    # acknowledge to Safaricom
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"},
                    status=status.HTTP_200_OK)


def mpesa_status(request):
    """
    AJAX GET from the browser.
      • code == null  → pending
      • code == 0     → success
      • code != 0     → failure
    Front-end decides what to do with it.
    """
    cid = request.GET.get("checkout_request_id")
    if not cid:
        return JsonResponse({"code": -1, "desc": "Missing payment reference"}, status=400)

    try:
        mp = MpesaPayment.objects.get(checkout_request_id=cid)
    except MpesaPayment.DoesNotExist:
        return JsonResponse({"code": -1, "desc": "Invalid payment reference"}, status=404)

    return JsonResponse({
        "code": mp.result_code,
        "desc": mp.result_desc   
    })