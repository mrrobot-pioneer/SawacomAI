import uuid
from django.conf import settings
from django.db import models

class ChatSession(models.Model):
    """
    Represents a single “thread” of messages for an authenticated user.
    We use a UUID as the primary key to expose unguessable session IDs.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions'
    )
    title = models.CharField(
        max_length=200,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Display the first 8 chars of the UUID in admin for brevity
        return f"Session {str(self.id)[:8]} ({self.user.username})"


class ChatMessage(models.Model):
    """
    A single message, either from the user or from the bot.
    """
    SENDER_CHOICES = [
        ('user', 'User'),
        ('bot',  'Bot'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at'] 

    def __str__(self):
        ts = self.created_at.strftime('%Y-%m-%d %H:%M')
        snippet = self.content[:30] + ('…' if len(self.content) > 30 else '')
        return f"[{ts}] {self.sender}: {snippet}"
