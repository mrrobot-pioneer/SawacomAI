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

    // 2. Axios API call to "/simulate/"
    axios.post('/simulate/', { message: userMessage })
    .then(response => {
      const data = response.data;
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
