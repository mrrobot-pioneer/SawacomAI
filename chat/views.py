from django.utils.timezone import localtime
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .utils import simulate_response


def index(request):
    """
    Renders the main chat interface.
    """
    return render(request, 'chat/index.html')


@api_view(['POST'])
def simulate_chatbot(request):
    """
    Accepts { "message": "...", "session_id": "<uuid>" (optional) }
    Returns { "reply": "...", "session_id": "<uuid or null>" }
    """
    user_msg = request.data.get('message', '').strip()
    session_uuid = request.data.get('session_id')  

    session = None
    new_title = None


    if request.user.is_authenticated:
        if session_uuid:
            try:
                session = ChatSession.objects.get(id=session_uuid, user=request.user)
            except ChatSession.DoesNotExist:
                return Response(
                    {'error': 'Invalid session_id.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Create a new ChatSession with a simple date-based title
            now_local = localtime()
            new_title = now_local.strftime("Chat on %b %d, %Y %I:%M %p")
            session = ChatSession.objects.create(
                user=request.user,
                title=new_title
            )

        # Save the user’s message
        ChatMessage.objects.create(session=session, sender='user', content=user_msg)

    bot_reply = simulate_response(user_msg)

    if session:
        ChatMessage.objects.create(session=session, sender='bot', content=bot_reply)

    return Response({
        'reply': bot_reply,
        'session_id': str(session.id) if session else None
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_chat_sessions(request):
    """
    GET /api/sessions/
    Returns [ { "id": "<uuid>", "created_at": "..." }, … ]
    """
    user = request.user
    sessions = ChatSession.objects.filter(user=user).order_by('-created_at')
    serializer = ChatSessionSerializer(sessions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_chat_messages(request, session_id):
    """
    GET /api/sessions/<uuid:session_id>/messages/
    Returns [ { id, sender, content, created_at }, … ] for that session.
    """
    user = request.user
    try:
        session = ChatSession.objects.get(id=session_id, user=user)
    except ChatSession.DoesNotExist:
        return Response(
            {'detail': 'Chat session not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    messages = ChatMessage.objects.filter(session=session).order_by('created_at')
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_chat_session(request, session_id):
    """
    DELETE /chat-sessions/<session_id>/delete/
    Only the owner may delete. On failure, set a Django error message.
    """

    session = get_object_or_404(ChatSession, id=session_id, user=request.user)

    try:
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Exception:
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def rename_chat_session(request, session_id):
    """
    PATCH /chat-sessions/<session_id>/rename/
    Body: { "title": "<new title>" }
    Only the owner may rename. On failure, return error message.
    """
    # 1) Fetch the ChatSession or return 404 if not found / not owned
    session = get_object_or_404(ChatSession, id=session_id, user=request.user)

    # 2) Extract the new title from request.data
    new_title = (request.data.get('title') or '').strip()
    if not new_title:
        return Response(
            {'error': 'Title is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 3) Attempt to update
    session.title = new_title
    try:
        session.save()
        return Response(status=status.HTTP_200_OK)
    except Exception:
        return Response(
            {'error': 'Could not rename chat session.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
