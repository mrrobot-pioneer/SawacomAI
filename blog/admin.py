from django.contrib import admin
from .models import Blog

@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    exclude = ('author',)  # don’t show author in the form
    list_display = ('title', 'author', 'status', 'created_at')

    def save_model(self, request, obj, form, change):
        if not change or obj.author is None:
            obj.author = request.user
        super().save_model(request, obj, form, change)
    class Media:
        css = {
            'all': ('blog/ckeditor_headings.css',)
        }