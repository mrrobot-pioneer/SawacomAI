from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import SignUpForm, LoginForm
from django.contrib.auth import login as auth_login, logout as auth_logout, authenticate
from django.contrib.auth.decorators import login_required

def signup(request):
    """
    Handle user sign-up. Renders a form and creates a new user with email & password.
    """
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            # re-authenticate
            user = authenticate(
                request,
                username=user.username,
                password=form.cleaned_data.get('password1')
            )

            if user is not None:
                auth_login(request, user)
                messages.success(request, "Your account has been created successfully!")
                return redirect('chats:index')
            else:
                messages.error(request, "Authentication failed. Please try logging in.")
    else:
        form = SignUpForm()

    return render(request, 'users/signup.html', {'form': form})


def login(request):
    """
    Handle user login. Uses Django's AuthenticationForm to validate email+password.
    """
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)
            messages.success(request, "You are now logged in.")
            return redirect('chats:index')    
    else:
        form = LoginForm()

    return render(request, 'users/login.html', {'form': form})


@login_required
def logout(request):
    """
    Log the user out and redirect to login page.
    """
    auth_logout(request)
    messages.info(request, "You have been logged out.")
    return redirect('chats:index')


@login_required
def delete_account(request):
    """
    Delete the logged-in user's account after confirmation.
    """
    if request.method == 'POST':
        user = request.user
        auth_logout(request)
        user.delete()
        messages.success(request, "Your account has been deleted. We're sorry to see you go.")
        return redirect('chats:index')
    return render(request, 'users/delete_account_confirm.html')