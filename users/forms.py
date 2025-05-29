from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User

class SignUpForm(UserCreationForm):
    """
    A custom form for user sign-up using email as the username,
    with widget attributes for styling and placeholders.
    """
    email = forms.EmailField(
        label='Email',
        required=True,
        widget=forms.EmailInput(
            attrs={
                'class': 'input-field',
                'placeholder': 'Enter your email address',
                'id': 'signup-email'
            }
        )
    )
    password1 = forms.CharField(
        label='Password',
        required=True,
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'class': 'input-field',
                'placeholder': 'Enter your password',
                'id': 'signup-password'
            }
        )
    )
    password2 = forms.CharField(
        label='Confirm Password',
        required=True,
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'class': 'input-field',
                'placeholder': 'Confirm your password',
                'id': 'signup-password-confirm'
            }
        )
    )

    class Meta:
        model = User
        fields = ('email', 'password1', 'password2')

    def save(self, commit=True):
        user = super().save(commit=False)
        # Use email as username
        user.username = self.cleaned_data['email']
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user
    

class LoginForm(AuthenticationForm):
    """A custom login form that uses email as the username field,
    with widget attributes for styling and placeholders."""
    username = forms.EmailField(
        label='Email',
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'input-field',
            'placeholder': 'Enter your email address',
            'id': 'login-email',
        })
    )
    password = forms.CharField(
        label='Password',
        required=True,
        strip=False,
        widget=forms.PasswordInput(attrs={
            'class': 'input-field',
            'placeholder': 'Enter your password',
            'id': 'login-password',
        })
    )