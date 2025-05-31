from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .utils import simulate_response
import time

def index(request):
    return render(request, 'chat/index.html') 


@api_view(['POST'])
def simulate_chatbot(request):
    """
    Accepts a JSON payload with a "message" field and returns a simulated reply.
    """
    user_msg = request.data.get('message', '')
    time.sleep(1)
    reply = simulate_response(user_msg)
    return Response({'reply': reply}, status=status.HTTP_200_OK)
