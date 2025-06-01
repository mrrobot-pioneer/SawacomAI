(() => {
  // Sidebar container
  const chatsList = document.getElementById('chatsList');
  let currentSessionId = null;

  /**
   * When clicking the ellipsis icon, hide all other options then toggle this one.
   */
  function toggleChatOptions(e, menuIcon) {
    e.stopPropagation();
    document.querySelectorAll(".chat-options").forEach(opt => opt.style.display = "none");
    const options = menuIcon.nextElementSibling;
    options.style.display = (options.style.display === "block") ? "none" : "block";
  }

  /**
   * Fetch sessions and render them.
   * - If HTTP 403: show “Log in to access your saved chats”
   * - If 200 + empty array: show “No saved chats yet”
   * - Otherwise on error: show “Error loading chats”
   */
  function showSidebarLoading() {
    chatsList.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const li = document.createElement('li');
      li.classList.add('skeleton-item');
      chatsList.appendChild(li);
    }
  }

  function loadSidebarSessions() {
    if (!chatsList) return;

    showSidebarLoading();

    axios.get('/chat-sessions/')
      .then(response => {
        // response.data is an array of sessions
        renderSidebarSessions(response.data);
      })
      .catch(err => {
        if (err.response && err.response.status === 403) {
          renderLoginMessage();
        } else  if(!err.response) {
          renderErrorMessage("Network error. Please check your connection.");
        }else {
          renderErrorMessage("Error loading chats. Please try again.");
        }
      });
  }
  

  /**
   * Show “Log in to access your saved chats” when user is not authenticated.
   */
  function renderLoginMessage() {
    chatsList.innerHTML = '';
    const div = document.createElement('div');
    div.classList.add('no-chats-message');
    div.innerHTML = `
      <i class="fa-solid fa-comment-slash"></i>
      <p>Log in to access your saved chats</p>
    `;
    chatsList.appendChild(div);
  }

  /**
   * Show “No saved chats yet” when user has no sessions.
   */
  function renderNoSavedChats() {
    chatsList.innerHTML = '';
    const div = document.createElement('div');
    div.classList.add('no-chats-message');
    div.innerHTML = `
      <i class="fa-solid fa-comment-slash"></i>
      <p>No saved chats yet</p>
    `;
    chatsList.appendChild(div);
  }

  /**
   * Show a generic error message (provided by caller).
   */
  function renderErrorMessage(msg) {
    chatsList.innerHTML = '';
    const div = document.createElement('div');
    div.classList.add('error-chats-message');
    div.innerHTML = `
      <p>${msg}</p>
      <button class="retry-btn" onclick="loadSidebarSessions()">
        <i class="fa-solid fa-rotate"></i>
        Retry
      </button>
    `;
    chatsList.appendChild(div);
  }

  /**
   * Render <li> elements for each session. Clicking <li> loads its messages.
   */
  function renderSidebarSessions(sessions) {
    chatsList.innerHTML = '';
    if (sessions.length === 0) {
      renderNoSavedChats();
      return;
    }

    sessions.forEach(sess => {
      const li = document.createElement('li');
      li.classList.add('chat-session');
      li.dataset.sessionId = sess.id;

      // Use the title returned by the backend
      const titleText = sess.title || "Untitled Chat";

      li.innerHTML = `
        <span class="session-title">${titleText}</span>
        <i class="fa-solid fa-ellipsis chat-menu"></i>
        <div class="chat-options" style="display: none;">
          <div class="option rename">
            <i class="fa-regular fa-pen-to-square"></i> Rename
          </div>
          <div class="option delete">
            <i class="fa-solid fa-trash"></i> Delete
          </div>
        </div>
      `;

      // When <li> is clicked, load messages AND close the sidebar
      li.addEventListener('click', () => {
        selectSession(sess.id);
        if (typeof closeSidebar === 'function') {
          closeSidebar();
        }
      });

      // Prevent li click when clicking the menu icon, and toggle options
      const menuIcon = li.querySelector('.chat-menu');
      menuIcon.addEventListener('click', e => toggleChatOptions(e, menuIcon));

      chatsList.appendChild(li);
    });

    if (currentSessionId) highlightActiveSession(currentSessionId);
  }

  /**
   * Select a session: mark active and load messages.
   */
  function selectSession(sessionId) {
    const path = window.location.pathname;

    if (path !== '/') {
      // Not on “/” → redirect with ?session_id=<id>
      window.location.href = '/?session_id=' + sessionId;
      return;
    }

    // Already on “/”:
    // 1) If we have a different sessionId in memory, or none, just load this one:
    if (sessionId !== currentSessionId) {
      currentSessionId = sessionId;
      highlightActiveSession(sessionId);
      if (typeof window.loadSessionMessages === 'function') {
        window.loadSessionMessages(sessionId);
      }
    }
    // If sessionId === currentSessionId, do nothing (already loaded)
  }

  /**
   * Add 'active' class to the chosen <li>.
   */
  function highlightActiveSession(sessionId) {
    chatsList.querySelectorAll('li').forEach(li => {
      li.classList.toggle('active', li.dataset.sessionId === sessionId);
    });
  }

  // Clicking outside chat-menu hides all options
  document.addEventListener('click', () => {
    document.querySelectorAll(".chat-options").forEach(opt => opt.style.display = "none");
  });

  // Expose for other scripts
  window.loadSidebarSessions = loadSidebarSessions;

  document.addEventListener('DOMContentLoaded', () => {
    // On load, see if ?session_id=<…> is present
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('session_id');
    if (paramId) {
      currentSessionId = paramId;
    }
    if (chatsList) loadSidebarSessions();
  });

  // When “New chat” is clicked:
  const newChatBtn = document.querySelector('.newchat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      const path = window.location.pathname;

    if (path !== '/') { // Not on “/”, so go there and start fresh
      window.location.href = '/';
    } else if (currentSessionId) { // Already on “/” but have an active session → reload to clear it
      window.location.href = '/';
    } 
    // else: on “/” and no currentSessionId → already a new chat, do nothing
  });
  }


})();
