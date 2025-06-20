from django.db import models
from django.conf import settings
import uuid

class Booking(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="Booking ID"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bookings',
        verbose_name="User",
    )
    date = models.DateField(
        verbose_name="Booking Date"
    )
    time = models.TimeField(
        verbose_name="Booking Time"
    )
    note = models.TextField(
        blank=True,
        null=True,
        verbose_name="Optional Notes",
        help_text="Extra details shared during booking."
    )
    is_paid = models.BooleanField(
        default=False,
        verbose_name="Payment Received?",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At"
    )

    def __str__(self):
        who = self.user.email if self.user else "Deleted user"
        return f"Booking by {who} on {self.date} at {self.time.strftime('%I:%M %p')}"


class MpesaPayment(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="Payment ID"
    )
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='payment',
        verbose_name="Related Booking",
    )
    checkout_request_id = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Checkout Request ID",
    )
    merchant_request_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Merchant Request ID",
    )
    amount = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        verbose_name="Amount Paid (KES)"
    )
    phone_number = models.CharField(
        max_length=15,
        verbose_name="M-Pesa Phone Number",
    )
    result_code = models.IntegerField(
        blank=True,
        null=True,
        verbose_name="Result Code",
    )
    result_desc = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Result Description",
    )
    transaction_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="M-Pesa Receipt Number",
    )
    received_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Received At",
    )

    def __str__(self):
        return f"Payment ({self.transaction_code}) for booking {self.booking.id}"
