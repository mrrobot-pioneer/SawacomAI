/**
 * index.js
 * ---------------------------------------------------------------------------
 * Main chat‑window UI for Sawacom.
 *  • Handles welcome sub‑text rotation
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

import {
  createMessageElement,
  scrollChatToBottom,
  activateChatLayout,
  updateSendButtonState,
} from './helpers.js';

import { 
  getSessionId, 
  setSessionId, 
  onSessionChange 
} from './sessionManager.js';

import { 
  fetchMessages, 
  simulateBot 
} from './apiCalls.js';

import {
  loadSidebarSessions,
  highlightActiveSession,
} from './chatSessions.js';

/* ------------------------------------------------------------------ */
/*  A. Rotating welcome sub‑text                                       */
/* ------------------------------------------------------------------ */
const subtextMessages = [
  `
    <span><i class="fas fa-user-secret"></i> Anonymous</span>
    <span class="separator"></span>
    <span><i class="fas fa-dollar-sign"></i> Free</span>
    <span class="separator"></span>
    <span><i class="fas fa-lock"></i> Secure</span>
  `,
  `
    <span><i class="fas fa-user-md"></i>
      <a href="#">Book a Professional</a> for <strong>Ksh 4500</strong>
    </span>
  `,
];
let subIdx = 0;
const subtextContainer = document.getElementById('subtextContainer');

function rotateSubtext() {
  subtextContainer.classList.remove('active');
  subtextContainer.classList.add('exit');
  setTimeout(() => {
    subIdx = (subIdx + 1) % subtextMessages.length;
    subtextContainer.innerHTML = subtextMessages[subIdx];
    subtextContainer.classList.remove('exit');
    subtextContainer.classList.add('active');
  }, 500);
}
setInterval(rotateSubtext, 4000);

/* ------------------------------------------------------------------ */
/*  B. DOM handles & initial UI state                                  */
/* ------------------------------------------------------------------ */
const textarea   = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatBody   = document.getElementById('chatBody');

let generating = false;          // TRUE while waiting for backend

textarea.focus();
updateSendButtonState(generating);

/* ------------------------------------------------------------------ */
/*  C. textarea auto‑resize                                            */
/* ------------------------------------------------------------------ */
textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
  if (!generating) updateSendButtonState(generating);
});

/* ------------------------------------------------------------------ */
/*  D. Session change → load messages                                  */
/* ------------------------------------------------------------------ */
// subscribe once – any change triggers a refresh
onSessionChange(id => loadSessionMessages(id));

async function loadSessionMessages(id) {
  if (!chatBody) return;                 // safety guard (should only run on chat page)

  activateChatLayout();
  syncUrl(id);
  showMessagesLoading();

  try {
    const msgs = await fetchMessages(id);
    renderChatWindow(msgs);
    highlightActiveSession(id);          // keep sidebar in sync
  } catch (err) {
    renderChatError(err);
  }
}

function showMessagesLoading() {
  chatBody.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const div = document.createElement('div');
    div.classList.add('skeleton-message');
    if (i % 2 === 0) {
      div.classList.add('even');
      div.innerHTML = '<div class="skeleton-text skeleton-item"></div>';
    } else {
      div.innerHTML = `
        <div class="skeleton-avatar skeleton-item"></div>
        <div class="skeleton-text skeleton-item"></div>`;
    }
    chatBody.appendChild(div);
  }
}

function renderChatError(err) {
  chatBody.innerHTML = '';
  const banner = document.createElement('div');
  banner.id = 'chatErrorBanner';
  banner.className = 'chat-error-banner alert error';
  const msg = !err.response ? 'Network error. Check your connection and try again.'
                            : 'Error fetching messages. Please try again.';
  banner.innerHTML = `
    <p>${msg}</p>
    <button class="retry-btn" onclick="location.reload()">
      <i class="fa-solid fa-rotate-right"></i> Retry
    </button>`;
  chatBody.appendChild(banner);
  scrollChatToBottom();
}

/* ------------------------------------------------------------------ */
/*  E. Render chat bubbles                                             */
/* ------------------------------------------------------------------ */
function renderChatWindow(messages) {
  chatBody.innerHTML = '';
  messages.forEach(m => {
    const cls   = m.sender === 'user' ? 'user-message' : 'bot-message';
    const inner = m.sender === 'bot'
      ? `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
           <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
         </svg>
         <div class="message-text">${m.content}</div>`
      : `<div class="message-text">${m.content}</div>`;
    chatBody.appendChild(createMessageElement(inner, cls));
  });
  scrollChatToBottom();
}

/* ------------------------------------------------------------------ */
/*  F. "Thinking" bubble + backend call                               */
/* ------------------------------------------------------------------ */
function simulateBotResponse(userText) {
  const thinking = createMessageElement(`
    <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
      <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
    </svg>
    <div class="message-text"><div class="thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`,
    'bot-message thinking');

  activateChatLayout();
  chatBody.appendChild(thinking);
  scrollChatToBottom();

  const payload = { message: userText };
  if (getSessionId()) payload.session_id = getSessionId();

  simulateBot(payload)
    .then(data => {
      // brand‑new chat? → update store + sidebar + URL
      if (data.session_id && !getSessionId()) {
        setSessionId(data.session_id);
        loadSidebarSessions();
        syncUrl(data.session_id);
      }

      thinking.querySelector('.message-text').innerText = data.reply || "I didn't get that.";
      thinking.classList.remove('thinking');
      scrollChatToBottom();
      generating = false;
      updateSendButtonState(generating);
    })
    .catch(() => {
      thinking.querySelector('.message-text').innerText = 'Sorry, something went wrong.';
      thinking.classList.remove('thinking');
      thinking.querySelector('.message-text').classList.add('error');
      generating = false;
      updateSendButtonState(generating);
    });
}

/* ------------------------------------------------------------------ */
/*  G. Send/Stop handler                                              */
/* ------------------------------------------------------------------ */
function handleSendMessage(e) {
  e.preventDefault();

  if (generating) {
    // user hits “Stop” while generating
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

  simulateBotResponse(text);
}

sendButton.addEventListener('click', handleSendMessage);
textarea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e);
});

/* ------------------------------------------------------------------ */
/*  H. Boot – restore session from URL                                */
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
