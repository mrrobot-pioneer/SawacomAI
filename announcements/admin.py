from django.contrib import admin
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display  = [
        'short_message', 'category', 'scope',
        'is_active', 'start_time', 'end_time'
    ]
    list_filter   = ['category', 'is_active']
    search_fields = ['message']
    filter_horizontal = ['users']
    ordering      = ['-start_time']

    def short_message(self, obj):
        return (obj.message[:37] + '…') if len(obj.message) > 40 else obj.message
    short_message.short_description = 'Message'
