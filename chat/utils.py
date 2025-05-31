def simulate_response(user_message: str) -> str:
    """
    Very simple rule‐based simulator. Later, when you wire up OpenAI,
    you’ll replace this with a call to OpenAI’s API.
    """
    text = user_message.strip().lower()

    # Example: if user asks about “help”:
    if 'help' in text or 'support' in text:
        return "Sure—I'm here to help. What specifically do you need assistance with?"
    if 'hello' in text or 'hi' in text:
        return "Hello there! How can I assist you today?"
    if 'bye' in text or 'thanks' in text:
        return "You're welcome! Feel free to reach out anytime."
    # Otherwise, a generic fallback:
    return "I'm still learning. Could you rephrase or ask something else?"
