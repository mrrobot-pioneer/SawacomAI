/**
 * helpers.js
 * Shared utilities for the Sawacom chat UI.
 * Keep these stateless (except where explicitly noted).
 */

  //////////////////////////////
  // ---- Cookie helpers ---- //
  //////////////////////////////
  export function getCookie(name) {
    let cookieValue = null;
    if (!document.cookie) return null;
  
    document.cookie.split(';').forEach(cookie => {
      const [key, val] = cookie.trim().split('=');
      if (key === name) cookieValue = decodeURIComponent(val);
    });
    return cookieValue;
  }
  
  // -- Automatically attach CSRF on every axios request --
  if (typeof axios !== 'undefined') {
    axios.defaults.headers.common['X-CSRFToken'] = getCookie('csrftoken');
  }
  
  ////////////////////////////////////////
  // ---- Chat-window DOM helpers ---- //
  ////////////////////////////////////////
  export function createMessageElement(html, className = '') {
    const el = document.createElement('div');
    el.classList.add('chat-message', ...className.split(' '));
    el.innerHTML = html;
    return el;
  }
  
  export function scrollChatToBottom() {
    const body = document.getElementById('chatBody');
    if (!body) return;
    window.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  }
  
  export function activateChatLayout() {
    if (window.hasActivated) return;           // run once
    const start  = document.getElementById('chatStart');
    const input  = document.getElementById('chatInputBox');
    const footer = document.getElementById('chatFooter');
    if (!input || !footer) return;
  
    if (start) start.style.display = 'none';
    footer.appendChild(input);
    window.hasActivated = true;
  }
  
  /////////////////////////////////////////////
  // ---- Send-button state machine ---- //
  /////////////////////////////////////////////
  export function updateSendButtonState(generating) {
    const textarea   = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const sendIcon   = sendButton.querySelector('i');
    const tooltip    = sendButton.querySelector('.tooltip');
    const isEmpty    = textarea.value.trim() === '';
  
    const ICON = { send: 'fa-solid fa-arrow-up', stop: 'fa-solid fa-stop' };
    if (generating) {
      sendButton.disabled = false;
      sendIcon.className  = ICON.stop;
      tooltip.textContent = 'Stop generating';
    } else if (isEmpty) {
      sendButton.disabled = true;
      sendIcon.className  = ICON.send;
      tooltip.textContent = 'Message is empty';
    } else {
      sendButton.disabled = false;
      sendIcon.className  = ICON.send;
      tooltip.textContent = '';
    }
  }
  