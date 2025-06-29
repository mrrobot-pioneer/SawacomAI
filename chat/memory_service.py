from __future__ import annotations
from dataclasses import dataclass

from langchain_openai import ChatOpenAI
from langchain.memory import ConversationSummaryBufferMemory
from langchain_community.chat_message_histories import (
    PostgresChatMessageHistory,
    SQLChatMessageHistory,
)
from langchain_core.prompts import PromptTemplate

# 1. choose proper ChatMessageHistory
def _history(session_id: str, conn_uri: str):
    if conn_uri.startswith("postgres"):
        return PostgresChatMessageHistory(
            connection_string=conn_uri,
            session_id=session_id
        )
    else:                                           # sqlite dev fallback
        return SQLChatMessageHistory(
            connection_string=conn_uri.replace("sqlite:///", "sqlite:///"),
            session_id=session_id
        )


# 2. factory that returns a ready memory object 
summary_prompt = PromptTemplate.from_template(
"""
Current running summary (for context):
{summary}

Newest lines from the conversation:
{new_lines}

You are a compassionate mental-health assistant.

Update the summary so it captures:
- The user's emotional state or mood
- The main issue they are struggling with
- Any personal context (name, relationships, work, school, goals)
- Important insights shared or progress made
- Support or advice you have already provided

Keep the tone emotionally attuned and human-centered.

Respond with **only** the updated summary, written as if you're tracking this person's emotional journey.
"""
)

def build_memory(session_id: str, conn_uri: str,
                 summary_model: str, token_limit: int = 1500):
    summariser_llm = ChatOpenAI(
        streaming=False,
        model=summary_model,
        temperature=0.3
    )
    return ConversationSummaryBufferMemory(
        llm=summariser_llm,
        chat_memory=_history(session_id, conn_uri),
        max_token_limit=token_limit,     # keep summary + recent messages < 1 500 tokens
        return_messages=True,
        prompt=summary_prompt,
    )


# 3. helper: convert memory → list[dict] ready for OpenAI low-level call
ROLE_MAP = {"human": "user", "ai": "assistant", "system": "system"}

def memory_as_messages(memory) -> list[dict]:
    """
    LangChain 0.3 BaseMessage objects → OpenAI chat-format dicts.
    """
    lc_messages = memory.load_memory_variables({})["history"]
    return [
        {
            "role": ROLE_MAP.get(m.type, m.type),   # default to the raw type
            "content": m.content,
        }
        for m in lc_messages
    ]


# function to get a session summary
def get_session_summary(session_id: str, settings) -> str:
    memory = build_memory(
        session_id=session_id,
        conn_uri=settings.PG_CONN,
        summary_model=settings.OPENAI_SUMMARY_MODEL
    )
    return memory.moving_summary_buffer


# -----------------------------------------------------------------------------
# Convenience dataclass the view can call each turn
# -----------------------------------------------------------------------------
@dataclass
class ConversationContext:
    memory: ConversationSummaryBufferMemory
    openai_messages: list[dict]          # history to send before user_prompt


def load_context(session_id: str, settings) -> ConversationContext:
    mem = build_memory(
        session_id=session_id,
        conn_uri=settings.PG_CONN,
        summary_model=settings.OPENAI_SUMMARY_MODEL
    )
    msgs = memory_as_messages(mem)
    return ConversationContext(mem, msgs)
