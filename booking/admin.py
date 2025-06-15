from django.contrib import admin
from .models import Booking, MpesaPayment

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'date', 'time', 'confirmed', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('user__username', 'id')
    ordering = ('-created_at',)

@admin.register(MpesaPayment)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'phone_number', 'received_at')