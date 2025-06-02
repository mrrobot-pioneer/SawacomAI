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
      <i class="fa-solid fa-comment-slash" style="font-size: 1.5rem"></i>
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

      // 1) Clicking anywhere on the LI (except the menu‐icon) loads messages
      li.addEventListener('click', () => {
        selectSession(sess.id);
        if (typeof closeSidebar === 'function') closeSidebar();
      });

      // 2) Toggle chat‐options menu when the “ellipsis” icon is clicked
      const menuIcon = li.querySelector('.chat-menu');
      menuIcon.addEventListener('click', e => toggleChatOptions(e, menuIcon));

      // 3) “Rename” option
      const renameOption = li.querySelector('.option.rename');
      renameOption.addEventListener('click', e => {
        e.stopPropagation();
        startRename(li, sess.id, titleText);
      });

      // 4) “Delete” option
      const deleteOption = li.querySelector('.option.delete');
      deleteOption.addEventListener('click', e => {
        e.stopPropagation();
        showDeleteModal(sess.id);
      });

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


  // ———————— DELETE Modal Logic ————————
  let toDeleteSessionId = null;
  const deleteModal = document.getElementById('deleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  function showDeleteModal(sessionId) {
    toDeleteSessionId = sessionId;
    deleteModal.style.display = 'flex';
  }

  function hideDeleteModal() {
    toDeleteSessionId = null;
    deleteModal.style.display = 'none';
    if (typeof closeSidebar === 'function') closeSidebar();
  }

  deleteModal.addEventListener('click', () => {
    hideDeleteModal();
  });

  cancelDeleteBtn.addEventListener('click', () => {
    hideDeleteModal();
  });

  confirmDeleteBtn.addEventListener('click', () => {
    if (!toDeleteSessionId) return;

    const deletingId = toDeleteSessionId;
    toDeleteSessionId = null;

    hideDeleteModal();

    axios.delete(`/chat-sessions/${deletingId}/delete/`)
      .then(() => {
        if (deletingId === currentSessionId) {
          window.location.href = '/';
        } else {
          const li = chatsList.querySelector(`li[data-session-id="${deletingId}"]`);
          if (li) li.remove();
        }
      })
      .catch(err => {
        const isNetworkError = !err.response;
        const msgText = isNetworkError
          ? 'Network error. Please check your connection and try again.'
          : 'Could not delete session. Please try again.';
        showGlobalMessage(msgText);
      });
  });
  
  // ———————— RENAME Inline Logic ————————

  /**
   * Turn the <span class="session-title"> into an <input> so the user can edit.
   * When “Enter” is pressed or the input loses focus, send a PATCH if changed.
   */
  function startRename(liElement, sessionId, oldTitle) {
    // 1) Hide any other open rename/edit fields first
    document.querySelectorAll('.rename-input').forEach(inp => {
      inp.parentElement.querySelector('.session-title').style.display = 'inline';
      inp.remove();
    });

    // 2) Get the <span class="session-title">
    const titleSpan = liElement.querySelector('.session-title');
    titleSpan.style.display = 'none';

    // 3) Create an <input class="rename-input"> in its place
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldTitle;
    input.classList.add('rename-input');
    // Insert right before the span so it occupies same spot
    titleSpan.parentNode.insertBefore(input, titleSpan);

    input.focus();
    input.select();

    input.addEventListener("click", (e)=>{
      e.stopPropagation();
    })

    // If user hits Enter, commit; if user hits Escape, cancel
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename(liElement, sessionId, input, oldTitle);
      } else if (e.key === 'Escape') {
        cancelRename(input, titleSpan);
      }
    });

    // If user clicks away, commit too
    input.addEventListener('blur', () => {
      commitRename(liElement, sessionId, input, oldTitle);
    });
  }

  function cancelRename(inputEl, spanEl) {
    inputEl.remove();
    spanEl.style.display = 'inline';
    
    if (typeof closeSidebar === 'function') closeSidebar();
  }

  function commitRename(liElement, sessionId, inputEl, oldTitle) {
    const newTitle = inputEl.value.trim();
    const spanEl = liElement.querySelector('.session-title');
  
    if (!newTitle || newTitle === oldTitle) {
      cancelRename(inputEl, spanEl);
      return;
    }
  
    // 1) Optimistically update the UI
    spanEl.innerText = newTitle;
    cancelRename(inputEl, spanEl);
  
    // 2) Send PATCH to backend
    axios.patch(`/chat-sessions/${sessionId}/rename/`, { title: newTitle })
      .then(() => {
       //do nothing, as we already updated the new title
      })
      .catch(err => {
        // 1) Revert UI back to old title
        spanEl.innerText = oldTitle;
  
        const isNetworkError = !err.response;
        const msgText = isNetworkError
          ? 'Network error. Please check your connection and try again.'
          : 'Could not rename chat session. Please try again.';
        showGlobalMessage(msgText);
  
        // Wire up the close-button
        const closeBtn = li.querySelector('.close-btn');
        closeBtn.addEventListener('click', e => {
          e.stopPropagation();
          li.remove();
        });
      });
  }

  /**
   * Show a global message at the top of <main> with a close‐button.
   */
  function showGlobalMessage(text) {
    let messagesUl = document.querySelector('ul.global-messages');
    if (!messagesUl) {
      const mainTag = document.querySelector('main');
      if (!mainTag) return;
      messagesUl = document.createElement('ul');
      messagesUl.classList.add('global-messages');
      mainTag.prepend(messagesUl);
    }

    const li = document.createElement('li');
    li.setAttribute('role', 'alert');
    li.classList.add('global-message', 'error');
    li.innerHTML = `
      <span>${text}</span>
      <span class="close-btn">&times;</span>
    `;

    messagesUl.prepend(li);
    const closeBtn = li.querySelector('.close-btn');
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      li.remove();
    });
  }
  
})();
