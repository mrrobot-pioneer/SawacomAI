from django.db import models
from django.conf import settings
import uuid

class Booking(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,                # allow NULL when user is deleted
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bookings'
    )
    date = models.DateField()
    time = models.TimeField()
    note = models.TextField(blank=True, null=True)
    confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        who = self.user.email if self.user else "Deleted user"
        return f"{who} — {self.date} @ {self.time}"


class MpesaPayment(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='payment'
    )
    checkout_request_id  = models.CharField(max_length=100, unique=True)
    merchant_request_id  = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    phone_number = models.CharField(max_length=20)
    result_code = models.IntegerField(blank=True, null=True)
    result_desc = models.CharField(max_length=255, blank=True, null=True)
    received_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"M-Pesa {self.checkout_request_id} for booking {self.booking.id}"