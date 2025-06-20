from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    path("", views.booking_page, name="book"),
    path("payment/", views.initiate_payment, name="initiate_payment"),
    path("payment/callback/", views.handle_mpesa_callback,  name="handle_mpesa_callback"),   
    path("payment/stream/<str:checkout_id>/", views.payment_status_stream, name="mpesa_stream")
]
