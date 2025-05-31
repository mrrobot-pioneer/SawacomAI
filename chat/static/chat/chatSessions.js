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
     */
    function loadSidebarSessions() {
      if (!chatsList) return;
      axios.get('/chat-sessions/')
        .then(response => renderSidebarSessions(response.data))
        .catch(err => console.error('Error loading chat sessions:', err));
    }
  
    /**
     * Render <li> elements for each session. Clicking <li> loads its messages.
     */
    function renderSidebarSessions(sessions) {
      chatsList.innerHTML = '';
      if (sessions.length === 0) {
        const emptyChats = document.createElement('div');
        emptyChats.classList.add('no-chats-message');
        emptyChats.innerHTML = `
          <i class="fa-solid fa-comment-slash"></i>
          <p>No chats yet</p>
        `;
        chatsList.appendChild(emptyChats);
        return;
      }
  
      sessions.forEach(sess => {
        const li = document.createElement('li');
        li.dataset.sessionId = sess.id;
  
        // Use the title returned by the backend ↴
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
  
        // Clicking anywhere in <li> (except the menu icon) loads session
        li.addEventListener('click', () => selectSession(sess.id, li));
  
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
    function selectSession(sessionId, liElement) {
      currentSessionId = sessionId;
      highlightActiveSession(sessionId);
      if (typeof window.loadSessionMessages === 'function') {
        window.loadSessionMessages(sessionId);
      }
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
      if (chatsList) loadSidebarSessions();
    });
  })();
  