from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Chat at root (e.g. homepage, chat flow)
    path('', include('chat.urls')),

    # Auth and user profiles
    path('users/', include('users.urls')),

    # Pages like /about, /contact
    path('', include('pages.urls')), 
]
