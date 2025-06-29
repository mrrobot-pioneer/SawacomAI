from django.urls import path
from . import views

app_name = 'chats'

urlpatterns = [
    path('', views.index, name='index'), # main chat interface.
    path('chat-stream/', views.chat_stream, name='chat_stream'), # SSE streaming endpoint

    # Chat session management (authenticated users)
    path('chat-sessions/', views.list_chat_sessions, name='list_chat_sessions'), # list all chat sessions for the authenticated user
    path('chat-sessions/<uuid:session_id>/messages/', views.list_chat_session_messages, name='list_chat_session_messages'), # list all messages for a specific chat session
    path('chat-sessions/<uuid:session_id>/rename/',views. rename_chat_session, name='rename_chat_session'), #rename chat session
    path('chat-sessions/<uuid:session_id>/delete/',views. delete_chat_session, name='delete_chat_session'), #delete chat session
]
