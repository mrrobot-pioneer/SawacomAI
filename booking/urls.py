from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    # renders page
    path('', views.book_session, name='book'),
    # AJAX: init STK push
    path('payment/', views.pay_booking, name='pay_booking'),
    # MPesa callback (no CSRF)
    path('mpesa/callback/', views.mpesa_callback, name='mpesa_callback'),
]
