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
        phone_number        = data["phone_number"],
    )

    return JsonResponse({
      "success": True,
      "checkout_request_id": mp.checkout_request_id
    })


@api_view(['GET','POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """
    POST: Safaricom STK-Push webhook → update payment & booking
    GET : Browser long-poll → wait for result_code, then redirect with Django messages
    """
    # --- 1) Safaricom webhook (no auth) ---
    if request.method == 'POST':
        body = request.data.get("Body", {})
        cb   = body.get("stkCallback", {})
        cid  = cb.get("CheckoutRequestID")
        code = cb.get("ResultCode")
        desc = cb.get("ResultDesc")

        try:
            mp = MpesaPayment.objects.get(checkout_request_id=cid)
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

    # --- 2) Browser GET (long-poll + redirect) ---
    cid = request.query_params.get('checkout_request_id')
    if not cid:
        messages.error(request, "Missing payment reference.")
        return redirect('booking:book')

    timeout_secs = 180 
    interval_secs = 5
    start = time.time()

    while True:
        try:
            mp = MpesaPayment.objects.get(checkout_request_id=cid)
        except MpesaPayment.DoesNotExist:
            messages.error(request, "Invalid payment reference.")
            return redirect('booking:book')

        if mp.result_code is not None:
            break

        if time.time() - start >= timeout_secs:
            messages.error(request, "Payment is still processing. Please try again shortly.")
            return redirect('booking:book')

        time.sleep(interval_secs)


    # now we have a result
    if mp.result_code == 0:
        messages.success(request, mp.result_desc or "Payment successful! Booking confirmed.")
        return redirect('/')
    else:
        messages.error(request, mp.result_desc or "Payment failed. Please try again.")
        return redirect('booking:book')