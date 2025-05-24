from django.shortcuts import render

# Create your views here.
def login(request):
    """
    Render the login page.
    """
    return render(request, 'users/login.html')

def signup(request):
    """
    Render the registration page.
    """
    return render(request, 'users/signup.html')

def logout(request):
    """
    Render the logout page.
    """
    return render(request, 'users/logout.html')