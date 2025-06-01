/**
 * index.js
 *  - Main chat‐UI logic: rotating subtext, handling user input,
 *    calling the "/simulate/" endpoint, and rendering replies.
 */

(() => {
  // ——————————————————————————————————————————————
  // SECTION A: Rotate Welcome Subtext
  // ——————————————————————————————————————————————
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
    `
  ];
  let subtextIndex = 0;
  const subtextContainer = document.getElementById('subtextContainer');

  function rotateSubtext() {
    subtextContainer.classList.remove('active');
    subtextContainer.classList.add('exit');

    setTimeout(() => {
      subtextIndex = (subtextIndex + 1) % subtextMessages.length;
      subtextContainer.innerHTML = subtextMessages[subtextIndex];
      subtextContainer.classList.remove('exit');
      subtextContainer.classList.add('active');
    }, 500);
  }

  setInterval(rotateSubtext, 4000);


  // ——————————————————————————————————————————————
  // SECTION B: DOM References & State
  // ——————————————————————————————————————————————
  const textarea   = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const chatBody   = document.getElementById('chatBody');

  let generating = false; // true while awaiting bot response
  let currentSessionId = null;


  // Initial focus + button state
  textarea.focus();
  updateSendButtonState(generating);


  // ——————————————————————————————————————————————
  // SECTION C: Textarea Auto‐Resize & Button State
  // ——————————————————————————————————————————————
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    if (!generating) updateSendButtonState(generating);
  });


  function showMessagesLoading() {
    chatBody.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('skeleton-message');
      if (i % 2 === 0) {
        msgDiv.classList.add('even');
        msgDiv.innerHTML = `
        <div class="skeleton-text skeleton-item"></div>
      `;
      }else{
        msgDiv.innerHTML = `
        <div class="skeleton-avatar skeleton-item"></div>
        <div class="skeleton-text skeleton-item"></div>
      `;
      }
      chatBody.appendChild(msgDiv);
    }
  }
  
  function loadSessionMessages(sessionId) {
    activateChatLayout();
  
    // Update URL to include ?session_id= if not present
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id') !== sessionId) {
      params.set('session_id', sessionId);
      window.history.replaceState(null, '', `/?${params.toString()}`);
    }

    showMessagesLoading();
  
    axios.get(`/chat-sessions/${sessionId}/messages/`)
      .then(response => {
        const messages = response.data;
        currentSessionId = sessionId;
  
        // Clear any previous error banner
        const prevError = document.getElementById('chatErrorBanner');
        if (prevError) prevError.remove();
  
        renderChatWindow(messages);
        if (typeof window.highlightActiveSession === 'function') {
          window.highlightActiveSession(sessionId);
        }
      })
      .catch(err => {
        // 1) Clear chat body
        chatBody.innerHTML = '';
  
        // 2) Create an error banner with a Retry button
        const banner = document.createElement('div');
        banner.id = 'chatErrorBanner';
        banner.classList.add('chat-error-banner', 'alert', 'error');
  
        // 2a) If no err.response, it was likely a network error
        if (!err.response) {
          banner.innerHTML = `
            <p>Network error. Check your connection and try again.</p>
            <button id="retryLoadSession" class="retry-btn"> onclick="loadSessionMessages('${sessionId}')">
              <i class="fa-solid fa-rotate-right"></i>
              Retry
            </button>
          `;
        } else {
          // 2b) Otherwise, some other error (e.g. 404, 500)
          banner.innerHTML = `
            <p>Error fetching messages. Please try again.</p>
            <button id="retryLoadSession" class="retry-btn" onclick="loadSessionMessages('${sessionId}')">
              <i class="fa-solid fa-rotate-right"></i>
              Retry
            </button>
          `;
        }
  
        chatBody.appendChild(banner);
  
        scrollChatToBottom();
      });
  }
  
  window.loadSessionMessages = loadSessionMessages; // Expose to global

  // Now that loadSessionMessages is attached to window, check the URL:
   const urlParams = new URLSearchParams(window.location.search);
   const initialSessionId = urlParams.get('session_id');
   if (initialSessionId && typeof window.loadSessionMessages === 'function') {
     window.currentSessionId = initialSessionId;
     window.loadSessionMessages(initialSessionId);
   }

  function renderChatWindow(messages) {
    chatBody.innerHTML = ''; // clear existing bubbles

    messages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.classList.add('chat-message', msg.sender === 'user' ? 'user-message' : 'bot-message');
      
      if (msg.sender === 'bot') {
        // For bot messages, include the avatar SVG followed by the message text:
        bubble.innerHTML = `
          <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
          </svg>
          <div class="message-text">${msg.content}</div>
        `;
      } else {
        // For user messages, just render the text (no avatar):
        bubble.innerHTML = `<div class="message-text">${msg.content}</div>`;
      }

      chatBody.appendChild(bubble);
    });

    scrollChatToBottom();
  }

  window.renderChatWindow = renderChatWindow; // Expose to global 

  // ——————————————————————————————————————————————
  // SECTION D: Insert “Thinking” Bubble & Handle Fetch Inline
  // ——————————————————————————————————————————————
  function simulateBotResponse(userMessage) {
    // 1. Insert a “thinking” bubble
    const thinkingBubble = createMessageElement(
      `
        <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
          <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"/>
        </svg>
        <div class="message-text">
          <div class="thinking-indicator">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
          </div>
        </div>
      `,
      'bot-message thinking'
    );

    activateChatLayout();
    chatBody.appendChild(thinkingBubble);
    scrollChatToBottom();

    // Build payload including session_id (if already set)
    const payload = { message: userMessage };
    if (currentSessionId) {
      payload.session_id = currentSessionId;
    }

    // 2. Axios API call to "/simulate/"
    axios.post('/simulate/', payload)
    .then(response => {
      const data = response.data;

      // Save new session_id if this was the first message
      if (data.session_id && !currentSessionId) {
        currentSessionId = data.session_id;
        // Tell sidebar.js to refresh its list:
        if (typeof window.loadSidebarSessions === 'function') {
          window.loadSidebarSessions();
        }
      }

      const textEl = thinkingBubble.querySelector('.message-text');
      textEl.innerText = data.reply || "I didn't get that.";
      thinkingBubble.classList.remove('thinking');
      scrollChatToBottom();

      generating = false;
      updateSendButtonState(generating);
    })
    .catch(_ => {
      const textEl = thinkingBubble.querySelector('.message-text');
      textEl.innerText = "Sorry, something went wrong.";
      textEl.classList.add('error');
      thinkingBubble.classList.remove('thinking');
      scrollChatToBottom();

      generating = false;
      updateSendButtonState(generating);
    });
  }


  // ——————————————————————————————————————————————
  // SECTION E: Handle Send/Stop Click
  // ——————————————————————————————————————————————
  function handleSendMessage(e) {
    e.preventDefault();

    if (generating) {
      // User clicked “Stop” while bot was thinking
      generating = false;
      updateSendButtonState(generating);
      return;
    }

    const userText = textarea.value.trim();
    if (!userText) return;

    generating = true;
    updateSendButtonState(generating);

    // Show user's message bubble
    const userBubble = createMessageElement(
      `<div class="message-text">${userText}</div>`,
      'user-message'
    );
    chatBody.appendChild(userBubble);
    scrollChatToBottom();

    // Clear textarea
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));

    // Fire off bot response
    simulateBotResponse(userText);
  }

  sendButton.addEventListener('click', handleSendMessage);
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  });
 

})();
