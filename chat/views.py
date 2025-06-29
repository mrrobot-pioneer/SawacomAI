from django.utils.timezone import localtime
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from django.http import StreamingHttpResponse
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .utils import (validate_user_message, sse_error_response, make_error_stream, ask_openai_stream)
from .memory_service import load_context
from django.conf import settings
import json


def index(request):
    """
    Renders the main chat interface.
    """
    return render(request, 'chat/index.html')


@require_GET
def chat_stream(request):
    """
    SSE endpoint: validates, streams tokens, and passes errors as SSE events.
    """
    user_msg = request.GET.get('message', '').strip()
    session_uuid = request.GET.get('session_id')
    session = None

    # Validate user input
    validation_err = validate_user_message(user_msg)
    if validation_err:
        return sse_error_response(validation_err)

    # Handle chat session if user is logged in
    if request.user.is_authenticated:
        if session_uuid:
            try:
                session = ChatSession.objects.get(id=session_uuid, user=request.user)
            except ChatSession.DoesNotExist:
                return sse_error_response("Invalid session id.")
        else:
            new_title = localtime().strftime("Chat on %b %d, %Y %I:%M %p")
            session = ChatSession.objects.create(user=request.user, title=new_title)

        # Save user's message
        ChatMessage.objects.create(session=session, sender='user', content=user_msg)

    # Load LangChain memory for this session (session.id if logged-in, else "anon-<ip-timestamp>")
    mem_session_id = str(session.id) if session else request.META["REMOTE_ADDR"]
    ctx = load_context(mem_session_id, settings)

    # Streaming generator
    def event_stream():
        yield 'retry: 2000\n'
        yield f"event: meta\ndata: {json.dumps({'session_id': str(session.id) if session else None})}\n\n"

        full_reply = []
        try:
            for token in ask_openai_stream(user_msg, history=ctx.openai_messages):
                full_reply.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            yield from make_error_stream(str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

        yield "data: [DONE]\n\n"

        # persist assistant reply for authenticated users
        if session:
            assistant_reply = "".join(full_reply)
            ChatMessage.objects.create(session=session, sender='bot', content=assistant_reply)

            # tell LangChain memory about the turn & persist
            ctx.memory.save_context({"input": user_msg}, {"output": assistant_reply})

            # Store summary on ChatSession
            session.conversation_summary = ctx.memory.moving_summary_buffer
            session.save(update_fields=["conversation_summary"])

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'   # prevents Nginx from buffering
    return response


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
def list_chat_session_messages(request, session_id):
    """
    GET /api/sessions/<uuid:session_id>/messages/
    Returns [ { id, sender, content, created_at }, … ] for that session.
    """
    user = request.user
    try:
        session = ChatSession.objects.get(id=session_id, user=user)
    except ChatSession.DoesNotExist:
        return Response(
            {'error': "Couldn't load this chat. It does not exist or was deleted."},
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
