from django.shortcuts import render

def about_view(request):
    return render(request, 'pages/about.html')

def contact_view(request):
    return render(request, 'pages/contact.html')

def privacy_view(request):
    return render(request, 'pages/privacy.html')

def terms_view(request):
    return render(request, 'pages/terms.html')
