/**
 * index.js
 * ---------------------------------------------------------------------------
 * Main chat‑window UI for Sawacom.
 *  • Manages user input & “thinking” bubbles
 *  • Talks to the backend *only* through sessionManager
 *  • Renders messages and keeps URL, sidebar & store in sync
 * ---------------------------------------------------------------------------
 *  DEPENDENCIES
 *  – helpers.js              → tiny DOM helpers (no state)
 *  – sessionManager.js       → single source of truth for session state
 *  – chatSessions.js         → sidebar (for refresh / highlight hooks)
 * ---------------------------------------------------------------------------
 */

import { createMessageElement, scrollChatToBottom, activateChatLayout, updateSendButtonState } from './helpers.js';

import { getSessionId, setSessionId, onSessionChange } from './sessionManager.js';

import { fetchMessages } from './apiCalls.js';

import { loadSidebarSessions, highlightActiveSession } from './chatSessions.js';

import { createLoadingSpinner } from '../../../static/js/base.js';

/* ------------------------------------------------------------------ */
/*  A. DOM handles & initial UI state                                  */
/* ------------------------------------------------------------------ */
const textarea   = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatBody   = document.getElementById('chatBody');
let generating   = false;          // TRUE while waiting for backend

updateSendButtonState(generating);


/* ------------------------------------------------------------------ */
/*  B. textarea Functionality => resize, focus, chars limit                                         */
/* ------------------------------------------------------------------ */
const MAX_CHARS  = 500;                       // <— limit
const counterEl  = document.getElementById('charCounter');

textarea.focus();

// ---------------- textarea auto-resize + char limit ----------------
textarea.addEventListener('input', () => {
  // auto-resize
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
  if (!generating) updateSendButtonState(generating);

  // char counting
  const len = textarea.value.trim().length;
  const limitReached = len === MAX_CHARS;

  counterEl.textContent = `${len} / ${MAX_CHARS}`;
  counterEl.classList.toggle('limit-reached', limitReached);
});


/* ------------------------------------------------------------------ */
/*  C. Session change → load messages                                  */
/* ------------------------------------------------------------------ */
// subscribe once – any change triggers a refresh
onSessionChange(id => loadSessionMessages(id));

async function loadSessionMessages(id) {
  if (!chatBody || generating) return;      // safety guard (should only run on chat page and when not generating)

  activateChatLayout();
  syncUrl(id);
  showSpinner();

  try {
    const msgs = await fetchMessages(id);
    renderChatWindow(msgs);
    highlightActiveSession(id);          // keep sidebar in sync
  } catch (err) {
    renderChatError(err);
  }
}

function showSpinner() {
  chatBody.innerHTML = '';
  const spinner = createLoadingSpinner('var(--primary-color)', '3rem');
  const container = document.createElement('div');
  container.className = 'spinner-container';
  container.innerHTML = spinner.outerHTML;
  chatBody.appendChild(container);
}

function renderChatError(err) {
  chatBody.innerHTML = '';
  const banner = document.createElement('div');
  banner.id = 'chatErrorBanner';
  banner.className = 'chat-error-banner alert error';

  let msg;
  if (!err.response) {
    msg = 'Network error. Check your connection and try again.';
  } else if (err.response.data?.error) {
    msg = err.response.data.error;
  } else {
    msg = 'Error fetching messages. Please try again.';
  }

  
  banner.innerHTML = `
    <p>${msg}</p>
    <button class="retry-btn" id="retryFetchBtn">
      <i class="fa-solid fa-rotate-right"></i> Retry
    </button>`;
  chatBody.appendChild(banner);
  scrollChatToBottom();

  // Attach retry handler to refetch messages
  document.getElementById('retryFetchBtn')?.addEventListener('click', () => {
    const id = getSessionId();
    if (id) loadSessionMessages(id);
  });
}

/* ------------------------------------------------------------------ */
/*  D. Render chat bubbles                                             */
/* ------------------------------------------------------------------ */
function renderChatWindow(messages) {
  chatBody.innerHTML = '';
  messages.forEach(m => {
    const cls   = m.sender === 'user' ? 'user-message' : 'bot-message';
    const inner = m.sender === 'bot'
      ? `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
           <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
         </svg>
         <div class="message-text">${m.content.replace(/\n/g, '<br/>')}</div>`
      : `<div class="message-text">${m.content.replace(/\n/g, '<br/>')}</div>`;
    chatBody.appendChild(createMessageElement(inner, cls));
  });
  scrollChatToBottom();
}


/* -------------------------------------------------------------- */
/*  E. Streaming bot response with SSE + session-id handshake        */
/* -------------------------------------------------------------- */

let currentStream = null;           // holds the active EventSource

function handleBotResponse(userText) {
  /* ---------- 1. UI scaffolding ---------- */
  const thinking = createMessageElement(`
    <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
      <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
    </svg>
    <div class="message-text"><div class="thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`,
    'bot-message thinking'
  );

  const textEl = thinking.querySelector('.message-text');

  activateChatLayout();
  chatBody.appendChild(thinking);
  scrollChatToBottom();

  /* ---------- 2. build & open SSE stream ---------- */
  const qs = new URLSearchParams({
    message: userText,
    session_id: getSessionId() || ''   // blank if new chat
  }).toString();

  const source = new EventSource(`/chat-stream/?${qs}`);
  currentStream = source;             // so we can cancel later

  /* ---- 2a. meta event: grab session_id once ---- */
  source.addEventListener('meta', (e) => {
    const { session_id } = JSON.parse(e.data || '{}');
    if (session_id && !getSessionId()) {
      setSessionId(session_id);
      loadSidebarSessions();          // sidebar now shows fresh chat
      syncUrl(session_id);
    }
  }, { once: true });                 // runs only once

  /* ---- 2b. token stream ---- */
  let firstChunk = true;   // track first incoming token

  source.onmessage = (evt) => {
    if (evt.data === '[DONE]') {
      finishStream();
      return;
    }
  
    try {
      const { token } = JSON.parse(evt.data);
      if (token) {
        // a. First real chunk: clear loader once
        if (firstChunk) {
          textEl.innerHTML = '';
          thinking.classList.remove('thinking'); 
          firstChunk = false;
        }
  
        // b. Append chunk & keep chat pinned to bottom
        textEl.innerHTML += token.replace(/\n/g, '<br/>');
        scrollChatToBottom();
      }
    } catch {
      showError('Sorry, something went wrong.');
    }
  };
  

  /* ---- 2c. network / server ‘event: error’ error ---- */
  source.addEventListener('error', (e) => {
    if (e.data) {
      // -> Server sent explicit error JSON
      try {
        const { error } = JSON.parse(e.data);
        showError(error || 'Sorry, something went wrong.');
      } catch {
        showError('Sorry, something went wrong.');
      }
    } else {
      // -> Network / CORS / timeout
      showError('Network error. Check your connection and try again.');
    }
  });

  /* ---------- 3. helpers ---------- */
  function showError(msg) {
    textEl.textContent = msg;
    textEl.classList.add('error');
    finishStream();
  }

  function finishStream() {
    if (currentStream) currentStream.close();
    currentStream = null;
    generating = false;
    updateSendButtonState(generating);
  }
}

/* ------------------------------------------------------------------ */
/*  F. Send/Stop handler                                              */
/* ------------------------------------------------------------------ */
function handleSendMessage(e) {
  e.preventDefault();

  // user hits “Stop” while generating
  if (generating && currentStream) {
    currentStream.close();       // abort SSE
    currentStream = null;
    generating = false;
    updateSendButtonState(generating);
    return;
  }

  const text = textarea.value.trim();
  if (!text) return;

  // optimistic UI
  generating = true;
  updateSendButtonState(generating);
  chatBody.appendChild(createMessageElement(`<div class="message-text">${text}</div>`, 'user-message'));
  scrollChatToBottom();

  textarea.value = '';
  textarea.dispatchEvent(new Event('input'));

  handleBotResponse(text);
}

sendButton.addEventListener('click', handleSendMessage);
textarea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e);
});

/* ------------------------------------------------------------------ */
/*  G. Boot – restore session from URL                                */
/* ------------------------------------------------------------------ */
const urlId = new URLSearchParams(location.search).get('session_id');
if (urlId) setSessionId(urlId);

function syncUrl(id) {
  const p = new URLSearchParams(location.search);
  if (p.get('session_id') !== id) {
    p.set('session_id', id);
    history.replaceState(null, '', `/?${p.toString()}`);
  }
}
