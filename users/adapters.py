from django.contrib.auth import get_user_model
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.shortcuts import redirect
from django.contrib import messages

User = get_user_model()

class MySocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        This is called *after* successful authentication from the provider,
        but *before* the login is actually processed.
        If there’s a user in the DB with the same email as the social account,
        attach the socialaccount to that user.
        """
        if request.user.is_authenticated:
            # already signed in -> nothing to do
            return

        # Extract the email from the social login:
        email = (
            sociallogin.account.extra_data.get('email')
            or sociallogin.user.email
        )
        if not email:
            return

        try:
            existing_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return

        # Connect this new social account to the existing user
        sociallogin.connect(request, existing_user)
        messages.success(
            request,
            "Welcome back! We’ve linked your Google account to your existing profile."
        )
        # Then force a redirect to “complete signup” (or home):
        raise ImmediateHttpResponse(redirect('/'))
