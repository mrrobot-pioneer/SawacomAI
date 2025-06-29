# chat/admin.py

from django.contrib import admin
from .models import ChatSession, ChatMessage

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'conversation_summary', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('title', 'user__username', 'id')
    ordering = ('-created_at',)

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'sender', 'short_content', 'created_at')
    list_filter = ('sender', 'created_at')
    search_fields = ('content', 'session__id', 'sender')
    ordering = ('created_at',)

    def short_content(self, obj):
        return obj.content[:50] + ('…' if len(obj.content) > 50 else '')
    short_content.short_description = 'Content Preview'
