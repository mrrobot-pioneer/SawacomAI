from openai import OpenAI
from django.conf import settings
import json
from django.http import StreamingHttpResponse
from rest_framework import status

client = OpenAI(api_key=settings.OPENAI_API_KEY)

MAX_CHARS = 500

DEFAULT_SYSTEM_MSG = (
    "You are a compassionate mental health assistant. "
    "Always respond with empathy, clarity, and emotional support. "
    "If a user's message lacks clarity or context, gently ask follow-up questions "
    "to better understand them before offering advice or support."
)

def ask_openai_stream(
    user_prompt: str,
    history: list[dict] | None = None,
    system_msg: str = DEFAULT_SYSTEM_MSG,
):
    """
    Yield tokens while streaming.  `history` is a list of prior messages in
    OpenAI chat-format (role/content).  We splice it in before the new prompt.
    """
    messages = [{"role": "system", "content": system_msg}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_prompt})

    stream = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        stream=True,
        temperature=0.8,
        max_tokens=500,
        top_p=1.0,
        frequency_penalty=0.4,
        presence_penalty=0.3,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def make_error_stream(message: str, code: int = status.HTTP_400_BAD_REQUEST):
    """
    Tiny generator → emits a single SSE `event: error` then `[DONE]`.
    Keeps the HTTP status 200 so EventSource can read it.
    """
    yield f"event: error\ndata: {json.dumps({'error': message, 'code': code})}\n\n"
    yield "data: [DONE]\n\n"


def sse_error_response(message: str, code: int = status.HTTP_400_BAD_REQUEST):
    """
    Convenience wrapper that returns a ready-made StreamingHttpResponse
    containing one error event.
    """
    return StreamingHttpResponse(make_error_stream(message, code),
                                 content_type="text/event-stream")


def validate_user_message(msg: str):
    """
    Returns None on success OR a human-readable error string.
    """
    if not msg.strip():
        return "Message is required."
    if len(msg) > MAX_CHARS:
        return f"Character limit exceeded. Please limit to {MAX_CHARS} characters."
    return None
