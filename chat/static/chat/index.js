/**
 * Chatbot Frontend Logic
 * - Handles welcome animation, input interaction, message rendering, and layout updates
 */

// --- Welcome Subtext Animation ---
const messages = [
  `
    <span><i class="fas fa-user-secret"></i> Anonymous</span>
    <span class="separator"></span>
    <span><i class="fas fa-dollar-sign"></i> Free</span>
    <span class="separator"></span>
    <span><i class="fas fa-lock"></i> Secure</span>
  `,
  `
  <span><i class="fas fa-user-md"></i> <a href="#">Book a Professional</a> for <strong>Ksh 4500</strong></span>
  `
];

let currentIndex = 0;
const subtextContainer = document.getElementById('subtextContainer');

function rotateSubtext() {
  subtextContainer.classList.remove('active');
  subtextContainer.classList.add('exit');

  setTimeout(() => {
    currentIndex = (currentIndex + 1) % messages.length;
    subtextContainer.innerHTML = messages[currentIndex];
    subtextContainer.classList.remove('exit');
    subtextContainer.classList.add('active');
  }, 500);
}

setInterval(rotateSubtext, 4000);


// --- Selectors ---
const textarea = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const sendIcon = sendButton.querySelector('i');
const tooltip  = sendButton.querySelector('.tooltip');

// --- State ---
let generating = false;

// --- Constants ---
const ICON_SEND     = 'fa-solid fa-arrow-up';
const ICON_STOP     = 'fa-solid fa-stop';
const TEXT_EMPTY    = 'Message is empty';
const TEXT_STOP     = 'Stop generating';

// --- Utility: update button (disabled, icon, tooltip) based on current state ---
function updateSendButtonState() {
  const isEmpty = textarea.value.trim() === '';

  if (generating) {
    sendButton.disabled = false;
    sendIcon.className = ICON_STOP;
    tooltip.textContent = TEXT_STOP;
  } else if (isEmpty) {
    sendButton.disabled = true;
    sendIcon.className = ICON_SEND;
    tooltip.textContent = TEXT_EMPTY;
  } else {
    // ready-to-send
    sendButton.disabled = false;
    sendIcon.className = ICON_SEND;
    tooltip.textContent = '';
  }
}

// --- Event: textarea input auto-resize & state update ---
textarea.addEventListener('input', () => {
  // auto-resize
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  // state
  if (!generating) updateSendButtonState();
});

// --- Setup initial focus & button state ---
textarea.focus();
updateSendButtonState();

// --- Simulate bot response ---
function simulateBotResponse() {
  const thinking = createMessageElement(
    `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
      <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
    </svg>
     <div class="message-text">
       <div class="thinking-indicator">
         <div class="dot"></div><div class="dot"></div><div class="dot"></div>
       </div>
     </div>`, 'bot-message thinking'
  );

  activateChatLayout();
  chatBody.appendChild(thinking);
  scrollChatToBottom();

  // after response arrives
  setTimeout(() => {
    // insert real bot text here
    thinking.querySelector('.message-text').innerText =
      "Hello, I’m Sawacom—your AI mental health companion. I’m here to listen, provide support, and help guide you toward well-being.";
    thinking.classList.remove('thinking');
    scrollChatToBottom();

    // reset state
    generating = false;
    updateSendButtonState();
  }, 1000);
}

// --- Handle send/stop click ---
function handleSendMessage(e) {
  e.preventDefault();

  if (generating) {
    // user clicked STOP
    // implement cancellation logic here if connected to API
    generating = false;
    updateSendButtonState();
    return;
  }

  const message = textarea.value.trim();
  if (!message) return;

  // begin sending
  generating = true;
  updateSendButtonState();

  // user message bubble
  const userMsg = createMessageElement(
    `<div class="message-text"></div>`, 'user-message'
  );
  userMsg.querySelector('.message-text').innerText = message;
  chatBody.appendChild(userMsg);
  scrollChatToBottom();

  // clear input
  textarea.value = '';
  textarea.dispatchEvent(new Event('input'));

  // simulate bot typing/response
  simulateBotResponse();
}

// --- Event Listeners ---
sendButton.addEventListener('click', handleSendMessage);
textarea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e);
});

// --- Helpers from original file (import or define as needed) ---
function createMessageElement(content, className) {
  const div = document.createElement('div');
  div.classList.add('message', ...className.split(' '));
  div.innerHTML = content;
  return div;
}

function activateChatLayout() {
  if (window.hasActivated) return;

  // Grab references before removing any elements
  const chatStartEl = document.getElementById('chatStart');
  const inputBoxEl = document.getElementById('chatInputBox');
  const chatFooterEl = document.getElementById('chatFooter');

  // Only proceed if we have the input box and footer
  if (!inputBoxEl || !chatFooterEl) return;

  // Remove the initial chat start container (which includes the form)
  if (chatStartEl) chatStartEl.remove();

  // Append the input box into the footer
  chatFooterEl.appendChild(inputBoxEl);

  window.hasActivated = true;
}

function scrollChatToBottom() {
  window.scrollTo({ top: document.getElementById('chatBody').scrollHeight, behavior: 'smooth' });
}
