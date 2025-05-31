from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('', include('chat.urls')), # Chat at root (e.g. homepage, chat flow)
    path('users/', include('users.urls')), # Auth and user profiles
    path('accounts/', include('allauth.urls')), # social authentication => Google
    path('', include('pages.urls')), # Static pages like /about, /contact
    path('blog/', include('blog.urls')), # Blog section for articles, posts, etc. 
    path("ckeditor5/", include('django_ckeditor_5.urls')), #ckeditor for rich text editing
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)