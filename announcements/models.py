from django.db import models
from django.utils import timezone
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('error', 'Error'),
    ]

    message     = models.TextField()
    category    = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='info')
    is_active   = models.BooleanField(default=True, verbose_name="Active?")
    start_time  = models.DateTimeField(default=timezone.now)
    end_time    = models.DateTimeField(null=True, blank=True)
    users = models.ManyToManyField(
        User,
        blank=True,
        related_name='announcements',
        verbose_name="Target users",
        help_text="Leave empty to show this announcement to every user."
    )

    def is_visible(self):
        now = timezone.now()
        if not self.is_active or now < self.start_time:
            return False
        if self.end_time and now > self.end_time:
            return False
        return True

    @property
    def scope(self) -> str:
        """Human-readable scope for admin display."""
        return "Global" if not self.users.exists() else "User-specific"

    def __str__(self):
        return (self.message[:37] + "…") if len(self.message) > 40 else self.message