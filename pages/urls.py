from django.urls import path
from . import views

app_name = "pages"

urlpatterns = [
    path('about/', views.about_view, name='about'),
    path('contact/', views.contact_view, name='contact'),
    path('privacy/', views.privacy_view, name='privacy'),
    path('terms/', views.terms_view, name='terms'),
]
