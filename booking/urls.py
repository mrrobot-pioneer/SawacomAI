from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    path("",                   views.book_session,   name="book"),
    path("payment/",           views.pay_booking,    name="pay_booking"),
    path("mpesa/callback/",     views.mpesa_callback,  name="mpesa_callback"),   
    path("mpesa/status/",      views.mpesa_status,   name="mpesa_status"),    
]
