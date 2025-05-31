/**
 * helpers.js
 *  - Utility functions shared by the chat UI.
 */

    /**
     * getCookie(name)
     *  Reads a cookie by its name (needed for Django CSRF).
     */
    function getCookie(name) {
        let cookieValue = null;
        if (!document.cookie) return null;
    
        document.cookie.split(';').forEach(cookie => {
        const [key, val] = cookie.trim().split('=');
        if (key === name) {
            cookieValue = decodeURIComponent(val);
        }
        });
        return cookieValue;
    }

    // Configure Axios to send CSRF on every POST
    if (typeof axios !== 'undefined') {
        axios.defaults.headers.common['X-CSRFToken'] = getCookie('csrftoken');
    }
  

    /**
     * createMessageElement(htmlContent, className)
     *  Returns a <div class="message …"> ready to insert into the chat.
     *  - htmlContent: innerHTML for the message
     *  - className: space-separated additional classes (e.g. "user-message" or "bot-message thinking")
     */
    function createMessageElement(htmlContent, className) {
    const container = document.createElement('div');
    container.classList.add('chat-message', ...className.split(' '));
    container.innerHTML = htmlContent;
    return container;
    }
  

    /**
     * scrollChatToBottom()
     *  Scrolls the chat container (#chatBody) to show the most recent message.
     */
    function scrollChatToBottom() {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
        window.scrollTo({top: chatBody.scrollHeight, behavior: 'smooth'});
    }


    /**
     * activateChatLayout()
     *  Removes the initial “welcome” UI and moves the input box into the footer.
     *  Only runs once, on first message.
     */
    function activateChatLayout() {
    if (window.hasActivated) return;

    const chatStartEl  = document.getElementById('chatStart');
    const inputBoxEl   = document.getElementById('chatInputBox');
    const chatFooterEl = document.getElementById('chatFooter');

    if (!inputBoxEl || !chatFooterEl) return;

    if (chatStartEl) chatStartEl.remove();
    chatFooterEl.appendChild(inputBoxEl);

    window.hasActivated = true;
    }
  

    /**
     * updateSendButtonState(generating)
     *  Enables/disables the send button, toggles icons and tooltip text.
     */
    function updateSendButtonState(generating) {
        const textarea   = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        const sendIcon   = sendButton.querySelector('i');
        const tooltip    = sendButton.querySelector('.tooltip');
        const isEmpty    = textarea.value.trim() === '';
    
        const ICON_SEND  = 'fa-solid fa-arrow-up';
        const ICON_STOP  = 'fa-solid fa-stop';
        const TEXT_EMPTY = 'Message is empty';
        const TEXT_STOP  = 'Stop generating';
    
        if (generating) {
        sendButton.disabled = false;
        sendIcon.className  = ICON_STOP;
        tooltip.textContent = TEXT_STOP;
        } else if (isEmpty) {
        sendButton.disabled = true;
        sendIcon.className  = ICON_SEND;
        tooltip.textContent = TEXT_EMPTY;
        } else {
        sendButton.disabled = false;
        sendIcon.className  = ICON_SEND;
        tooltip.textContent = '';
        }
    }