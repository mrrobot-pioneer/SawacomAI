from django.urls import path
from . import views

app_name = 'chats'

urlpatterns = [
    path('', views.index, name='index'), # main chat interface.
    path('simulate/', views.simulate_chatbot, name='simulate_chatbot'),
    path('chat-sessions/', views.list_chat_sessions, name='list_chat_sessions'), # list all chat sessions for the authenticated user
    path('chat-sessions/<uuid:session_id>/messages/', views.list_chat_messages, name='list_chat_messages'), # list all messages for a specific chat session
]
