from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    # renders page
    path('', views.book_session, name='book'),
    # AJAX: init STK push
    path('payment/', views.pay_booking, name='pay_booking'),
    # AJAX: poll payment status
    path('api/status/', views.payment_status_api, name='status_api'),
    # MPesa callback (no CSRF)
    path('api/mpesa/callback/', views.mpesa_callback_api, name='mpesa_callback_api'),
]
