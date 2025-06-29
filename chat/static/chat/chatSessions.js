/**
 * chatSessions.js
 * ---------------------------------------------------------------------------
 * Sidebar UI for listing, creating, renaming and deleting chat sessions.
 * - Pure UI concerns (DOM only)
 * - **No** direct data‑fetching logic outside the session manager
 * - Knows nothing about the main chat window – communicates through
 *   `sessionManager.js`, our single source of truth.
 * ---------------------------------------------------------------------------
 */

import {
  getSessionId,
  setSessionId,
  onSessionChange
} from './sessionManager.js';

import {
  fetchSessions,
  deleteSession,
  renameSession
} from './apiCalls.js';

import {
  createFlashMessage,
  openModal,
  closeSidebar
} from "../../../static/js/base.js"

// ---------------------------------------------------------------------------
// DOM CACHING & START‑UP
// ---------------------------------------------------------------------------

const chatsList   = document.getElementById('chatsList');
const newChatBtn  = document.querySelector('.newchat-btn');

if (chatsList)   loadSidebarSessions();   // fetch as soon as sidebar exists
if (newChatBtn)  newChatBtn.addEventListener('click', handleNewChat);

// keep the active <li> in sync with current session
onSessionChange(id => highlightActiveSession(id));

// ---------------------------------------------------------------------------
// PUBLIC API (imports from other modules may call these)
// ---------------------------------------------------------------------------

export function loadSidebarSessions() {
  if (!chatsList) return;

  fetchSessions()
    .then(renderSidebarSessions)
    .catch(err => {
      if(!err.response){
        renderErrorMessage("Network error. Please check your connection.")
      }else if(err.response.status === 403){
        renderLoginMessage()
      }else{
        renderErrorMessage("Error loading chats. Please try again.'")
      }
    });
}

export function highlightActiveSession(id) {
  chatsList?.querySelectorAll('li').forEach(li => {
    li.classList.toggle('active', li.dataset.sessionId === id);
  });
}

// ---------------------------------------------------------------------------
// RENDER HELPERS
// ---------------------------------------------------------------------------
 
function renderLoginMessage() {
  chatsList.innerHTML = '';
  const div = document.createElement('div');
  div.classList.add('no-chats-message');
  div.innerHTML = `
    <i class="fa-solid fa-comment-slash" style="font-size:1.5rem"></i>
    <p>Log in for chat history</p>
  `;
  chatsList.appendChild(div);
}

function renderNoSavedChats() {
  chatsList.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'no-chats-message';
  div.innerHTML = `
    <i class="fa-solid fa-comment-slash" style="font-size:1.5rem"></i>
    <p>No saved chats yet</p>`;
  chatsList.appendChild(div);
}

function renderErrorMessage(text) {
  chatsList.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'error-chats-message';
  div.innerHTML = `
    <p>${text}</p>
    <button class="retry-btn"><i class="fa-solid fa-rotate"></i> Retry</button>`;
  div.querySelector('button').addEventListener('click', loadSidebarSessions);
  chatsList.appendChild(div);
}

function renderSidebarSessions(sessions) {
  chatsList.innerHTML = '';
  if (!sessions.length) return renderNoSavedChats();

  sessions.forEach(sess => chatsList.appendChild(buildSessionLi(sess)));
  highlightActiveSession(getSessionId());
}

function buildSessionLi(sess) {
  const li = document.createElement('li');
  li.className       = 'chat-session';
  li.dataset.sessionId = sess.id;

  const title        = sess.title || 'Untitled Chat';

  li.innerHTML = `
    <span class="session-title">${title}</span>
    <i class="fa-solid fa-ellipsis chat-menu"></i>
    <div class="chat-options" style="display:none;">
      <div class="option rename"><i class="fa-regular fa-pen-to-square"></i> Rename</div>
      <div class="option delete"><i class="fa-solid fa-trash"></i> Delete</div>
    </div>`;

  // ----- interactions ------------------------------------------------------
  li.addEventListener('click', () => {
    selectSession(sess.id);
    closeSidebar();
  });

  const menuIcon   = li.querySelector('.chat-menu');
  const renameOpt  = li.querySelector('.option.rename');
  const deleteOpt  = li.querySelector('.option.delete');

  menuIcon .addEventListener('click', e => toggleChatOptions(e, menuIcon));
  renameOpt.addEventListener('click', e => { e.stopPropagation(); startRename(li, sess.id, title); });
  deleteOpt.addEventListener('click', e => { e.stopPropagation(); confirmDelete(sess.id); });
  return li;
}

// ---------------------------------------------------------------------------
// SESSION SELECTION & URL SYNC
// ---------------------------------------------------------------------------

function selectSession(id) {
  // Non‑chat pages – just redirect to home with the id
  if (location.pathname !== '/') {
    location.href = '/?session_id=' + id;
    return;
  }
  // Chat page – update central store (triggers chat‑window reload)
  setSessionId(id);
}

function handleNewChat() {
  const path = window.location.pathname;

  if(path !== '/' || getSessionId()){
    location.href = '/';
  }
}

// ---------------------------------------------------------------------------
// TOGGLE chat‑options ellipsis menu
// ---------------------------------------------------------------------------

function toggleChatOptions(e, menuIcon) {
  e.stopPropagation();
  document.querySelectorAll('.chat-options').forEach(opt => opt.style.display = 'none');
  const box = menuIcon.nextElementSibling;
  box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

// hide menus when clicking anywhere else
document.addEventListener('click', () => {
  document.querySelectorAll('.chat-options').forEach(el => el.style.display = 'none');
});

// ---------------------------------------------------------------------------
// DELETE  /  RENAME  (modal + inline edit)
// ---------------------------------------------------------------------------
//  *UI only* – the server APIs are hit directly here; no need to touch store.

function confirmDelete(sessionId) {
  openModal({
    title: 'Delete Chat?',
    html:  '<p>Are you sure you want to delete this chat session?</p>',
    actions: [
      { text: 'Cancel', value: false, className: 'btn btn-neutral' },
      { text: 'Delete', value: true,  className: 'btn btn-danger'  },
    ],
  }).then((shouldDelete) => {
    if (!shouldDelete) return;

    deleteSession(sessionId)
      .then(() => {
        if (sessionId === getSessionId()) location.href = '/';
        else chatsList.querySelector(`li[data-session-id="${sessionId}"]`)?.remove();
      })
      .catch(err => createFlashMessage(
        !err.response ? 'Network error. Please try again.' : 'Could not delete session.', 'error'
      ));

  });
}

// -----------------------------  RENAME ------------------------------------
function startRename(li, id, oldTitle) {
  // collapse any other inline edits first
  document.querySelectorAll('.rename-input').forEach(inp => {
    inp.parentElement.querySelector('.session-title').style.display = 'inline';
    inp.remove();
  });

  const span  = li.querySelector('.session-title');
  span.style.display = 'none';

  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = oldTitle;
  span.parentNode.insertBefore(input, span);
  input.focus(); input.select();

  input.addEventListener('click', e => e.stopPropagation());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commitRename();
    if (e.key === 'Escape') cancelRename();
  });
  input.addEventListener('blur', commitRename);

  function cancelRename() {
    input.remove(); span.style.display = 'inline';
  }

  function commitRename() {
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === oldTitle) return cancelRename();

    span.textContent = newTitle;
    cancelRename();   // optimistic UI update

    renameSession(id, newTitle)
      .catch((err) => {
        span.textContent = oldTitle;   // revert UI
        createFlashMessage(
        !err.response ? 'Network error. Please try again.' : 'Could not rename session.', 'error'
      )});
  }
}
