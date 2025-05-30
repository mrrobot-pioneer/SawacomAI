from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Chat at root (e.g. homepage, chat flow)
    path('', include('chat.urls')),

    # Auth and user profiles
    path('users/', include('users.urls')),

    #social authentication => Google
    path('accounts/', include('allauth.urls')),

    # Static pages like /about, /contact
    path('', include('pages.urls')), 

    # Blog section for articles, posts, etc.
    path('blog/', include('blog.urls')), 

    #ckeditor for rich text editing
    path("ckeditor5/", include('django_ckeditor_5.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)