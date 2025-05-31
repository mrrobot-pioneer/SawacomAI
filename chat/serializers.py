from rest_framework import serializers
from .models import ChatSession, ChatMessage

class ChatSessionSerializer(serializers.ModelSerializer):
    """
    Serializes ChatSession without nested messages—
    we only need `id` and `created_at` for the sidebar.
    """
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializes each ChatMessage so the front end can render the conversation.
    """
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'content', 'created_at']
