from django.urls import path
from . import views

app_name = 'chats'

urlpatterns = [
    path('', views.index, name='index'), # Home page
    path('simulate/', views.simulate_chatbot, name='simulate_chatbot'),
]
