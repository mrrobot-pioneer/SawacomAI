from openai import OpenAI
from django.conf import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

DEFAULT_SYSTEM_MSG = (
    "You are a compassionate mental health assistant. "
    "Always respond with empathy, clarity, and emotional support. "
    "If a user's message lacks clarity or context, gently ask follow-up questions "
    "to better understand them before offering advice or support."
)

def ask_openai(prompt, system_msg=DEFAULT_SYSTEM_MSG):
    """
    Sends a user prompt to OpenAI's Chat API and returns the assistant's reply.

    Raises:
        Exception: if the OpenAI API call fails.
    """
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": prompt}
        ],
        temperature=0.8,         # natural, emotionally varied tone
        max_tokens=500,          # balanced length
        top_p=1.0,
        frequency_penalty=0.4,   # reduce repetition
        presence_penalty=0.3     # encourage fresh, supportive responses
    )

    return response.choices[0].message.content.strip()
