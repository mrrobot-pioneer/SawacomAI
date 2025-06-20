import json
from django.shortcuts import render
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse

from .models import Booking, MpesaPayment
from .utils  import stk_push, wait_for_payment      


# --------------------------------------------------------------------------- #
#  VIEW 1: Render booking form (HTML, not DRF)                                #
# --------------------------------------------------------------------------- #
@login_required
def booking_page(request):
    """Serve the professional-booking page."""
    return render(request, "booking/book.html")


# --------------------------------------------------------------------------- #
#  VIEW 2: Kick-off STK push (JSON → JSON)                                    #
# --------------------------------------------------------------------------- #
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    data = request.data
    booking = Booking.objects.create(
        user=request.user,
        date=data["date"],
        time=data["time"],
        note=data.get("note", ""),
    )

    callback_url = request.build_absolute_uri(reverse("booking:handle_mpesa_callback"))
    stk_resp = stk_push(data["phone_number"], amount=1, callback_url=callback_url)

    if stk_resp.get("error") or stk_resp.get("errorCode"):
        return Response(
            {"error": stk_resp.get("error") or stk_resp.get("errorMessage")},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if stk_resp.get("ResponseCode") != "0":
        return Response(
            {"error": stk_resp.get("ResponseDescription", "STK push rejected")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    MpesaPayment.objects.create(
        booking = booking,
        checkout_request_id = stk_resp["CheckoutRequestID"],
        merchant_request_id = stk_resp["MerchantRequestID"],
        amount=int(data["amount"]),
        phone_number = data["phone_number"],
    )
    return Response({"checkout_request_id": stk_resp["CheckoutRequestID"]}, status=200)


# --------------------------------------------------------------------------- #
#  VIEW 3: Safaricom callback (DRF)                                           #
# --------------------------------------------------------------------------- #
@api_view(['POST'])
@permission_classes([AllowAny])
def handle_mpesa_callback(request):
    """
    POST: Safaricom STK-Push webhook → update payment & booking
    """

    # --- 1) Safaricom webhook (no auth) ---
    body = request.data.get("Body", {})
    cb   = body.get("stkCallback", {})
    cid  = cb.get("CheckoutRequestID")
    code = int(cb.get("ResultCode", -1))
    desc = cb.get("ResultDesc")

    # Try to extract MpesaReceiptNumber
    tx_code = None
    metadata = cb.get("CallbackMetadata", {}).get("Item", [])
    for item in metadata:
        if item.get("Name") == "MpesaReceiptNumber":
            tx_code = item.get("Value")
            break

    print(f"Callback received: {cid}, code={code}, desc={desc}, tx_code={tx_code}")

    try:
        mp = MpesaPayment.objects.get(checkout_request_id=cid)
    except MpesaPayment.DoesNotExist:
        return Response({"ResultCode": 1, "ResultDesc": "Booking not found"}, status=status.HTTP_200_OK)

    # update payment record
    mp.result_code = code
    mp.result_desc = desc
    mp.transaction_code = tx_code
    mp.save()

    # confirm booking if successful
    if code == 0:
        b = mp.booking
        b.is_paid = True
        b.save(update_fields=['is_paid'])

    # acknowledge to Safaricom
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"}, status=status.HTTP_200_OK)


# --------------------------------------------------------------------------- #
#  VIEW 4: Server-Sent Events stream (HTML5 > WebSocket for one-shot updates) #
# --------------------------------------------------------------------------- #
@login_required
def payment_status_stream(request, checkout_id):
    """
    SSE endpoint – uses wait_for_payment() from utils, so no duplicated loop.
    """
    def event_stream():
        for payload in wait_for_payment(checkout_id):
            if payload["code"] == 0:
                messages.success(request, "Your session was booked and paid successfully.")
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )