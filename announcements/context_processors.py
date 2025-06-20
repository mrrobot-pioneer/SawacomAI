from django.db.models import Q
from django.utils import timezone
from .models import Announcement

def global_announcements(request):
    now = timezone.now()

    # Base queryset: active + within start/end window
    base_qs = Announcement.objects.filter(
        is_active=True,
        start_time__lte=now,
    ).distinct()

    if request.user.is_authenticated:
        # Show global OR user-specific announcements for this user
        qs = base_qs.filter(
            Q(users__isnull=True) | Q(users=request.user)
        )
    else:
        # Anonymous users only see global (users blank) announcements
        qs = base_qs.filter(users__isnull=True)

    # newest active announcement wins
    ann = qs.order_by('-start_time').first()
    return {'global_announcement': ann}
