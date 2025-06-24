/**
 * baseUI.js
 * ────────────────────────────────────────────────────────────────────────────
 * Handles layout + feedback interactions:
 * 1. Account dropdown
 * 2. Sidebar behavior (desktop + mobile)
 * 3. CSRF wiring for Axios
 * 4. Flash + spinner utility functions
 * 5. Global modal handler
 * ────────────────────────────────────────────────────────────────────────────
 */

/* ------------------------------------------------------------------ */
/* 1 ▸ HEADER CONTROLS: Dropdown + Flash Message Dismiss              */
/* ------------------------------------------------------------------ */

const accountIcon = document.getElementById('accountIcon');

// Allow toggling the account dropdown in the header
if (accountIcon) {
  accountIcon.addEventListener('click', e => {
    e.stopPropagation();
    accountIcon.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    accountIcon.classList.remove('open');
  });
}

/* ------------------------------------------------------------------ */
/* 2 ▸ SIDEBAR CONTROLS                                               */
/* ------------------------------------------------------------------ */

const sidebarEl = document.querySelector('.sidebar');
const overlayEl = document.querySelector('.sidebar-overlay');

const btn = {
  collapse: document.getElementById('sidebarCollapse'),
  expand  : document.getElementById('sidebarToggle'),
  close   : document.getElementById('sidebarClose'),
};

function collapseSidebar() {
  sidebarEl?.classList.add('collapsed');
  if (btn.expand) btn.expand.style.display = 'flex';
}

function expandSidebar() {
  sidebarEl?.classList.remove('collapsed');
  if (btn.expand) btn.expand.style.display = 'none';
}

export function openSidebar() {
  sidebarEl?.classList.add('open');
  overlayEl?.classList.add('show');
  document.dispatchEvent(new CustomEvent('sidebar:open'));
}

export function closeSidebar() {
  sidebarEl?.classList.remove('open');
  overlayEl?.classList.remove('show');
  document.dispatchEvent(new CustomEvent('sidebar:close'));
}

// Connect sidebar control buttons
btn.collapse?.addEventListener('click', collapseSidebar);
btn.expand?.addEventListener('click', () => {
  expandSidebar();
  openSidebar();
});
btn.close?.addEventListener('click', closeSidebar);
overlayEl?.addEventListener('click', closeSidebar);


/* ------------------------------------------------------------------ */
/* 3 ▸ CSRF HELPER + AXIOS SETUP                                      */
/* ------------------------------------------------------------------ */

/**
 * Extract a cookie value by name
 */
export function getCookie(name) {
  let value = null;
  document.cookie.split(';').forEach(cookie => {
    const [key, val] = cookie.trim().split('=');
    if (key === name) value = decodeURIComponent(val);
  });
  return value;
}

// Automatically apply CSRF token to all Axios requests
if (typeof axios !== 'undefined') {
  const csrf = getCookie('csrftoken');
  if (csrf) axios.defaults.headers.common['X-CSRFToken'] = csrf;
}


/* ------------------------------------------------------------------ */
/* 4 ▸ FLASH + SPINNER UTILITIES                                      */
/* ------------------------------------------------------------------ */

/**
 * Create a temporary flash message.
 */
export function createFlashMessage(text, type = 'info', clearAll = false, autoDismiss = true) {
  let ul = document.querySelector('ul.global-messages');
  if (!ul) {
    ul = document.createElement('ul');
    ul.className = 'global-messages';
    document.body.prepend(ul);
  }
  if (clearAll) ul.innerHTML = '';

  const li = document.createElement('li');
  li.className = `global-message ${type}`;
  li.setAttribute('role', 'alert');
  li.innerHTML = `<span class="message-text">${text}</span>`;

  ul.prepend(li);
  requestAnimationFrame(() => li.classList.add('show'));

  if (autoDismiss) {
    setTimeout(() => hideAndRemove(li), 8000);
  }
}

function hideAndRemove(li) {
  li.classList.remove('show');
  li.classList.add('hide');
  li.addEventListener('transitionend', () => li.remove(), { once: true });
}

/**
 * Automatically dismiss Django-rendered flash messages
 */
function autoDismissDjangoMessages() {
  const messages = document.querySelectorAll('ul.global-messages .global-message');

  messages.forEach(msg => {
    requestAnimationFrame(() => msg.classList.add('show'));
    setTimeout(() => {
      msg.classList.remove('show');
      msg.classList.add('hide');
      msg.addEventListener('transitionend', () => msg.remove(), { once: true });
    }, 5000);
  });
}

autoDismissDjangoMessages();

/**
 * Create a global loading spinner element
 */
export function createLoadingSpinner(color = 'var(--primary-color)', size = '1.5rem') {
  const spinner = document.createElement('span');
  spinner.className = 'global-spinner';
  spinner.style.setProperty('--spinner-color', color);
  spinner.style.setProperty('--spinner-size', size);
  return spinner;
}

/* ------------------------------------------------------------------ */
/* 5 ▸ GLOBAL MODAL HANDLER                                          */
/* ------------------------------------------------------------------ */

/**
 * Show a modal. Returns a Promise that resolves with the `value` of
 * the button the user clicked (or null if closed).
 */

export function openModal({ title, html, actions = [] }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('globalModal');
    const tEl = document.getElementById('modalTitle');
    const bEl = document.getElementById('modalBody');
    const fEl = document.getElementById('modalFooter');

    // fill content
    tEl.textContent = title;
    bEl.innerHTML   = html;
    fEl.innerHTML   = '';

    // default “Close” if no actions provided
    if (!actions.length) actions = [{ text: 'Close', value: null, className: 'btn' }];

    actions.forEach(({ text, value, className = 'btn primary-btn' }) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.className   = className;
      btn.addEventListener('click', () => close(value));
      fEl.appendChild(btn);
    });

    // show + focus first button
    overlay.classList.add('show');
    fEl.querySelector('button')?.focus();

    // close helper
    function close(returnVal) {
      overlay.classList.remove('show');
      resolve(returnVal);
    }

    // click outside dialog closes (optional)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    }, { once: true });
  });
}


/* ------------------------------------------------------------------ */
// 6 ▸ THEME TOGGLE HANDLER
/* ------------------------------------------------------------------ */
document.getElementById('themeToggleBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();

  const currentPref = getThemePreference(); // 'system', 'light', 'dark'

  const html = `
    <form id="themeForm" class="theme-options">
      <label><input type="radio" name="theme" value="system" ${currentPref === 'system' ? 'checked' : ''}/> System</label><br/>
      <label><input type="radio" name="theme" value="light" ${currentPref === 'light' ? 'checked' : ''}/> Light</label><br/>
      <label><input type="radio" name="theme" value="dark" ${currentPref === 'dark' ? 'checked' : ''}/> Dark</label>
    </form>
  `;

  const result = await openModal({
    title: 'Choose Theme',
    html,
    actions: [
      { text: 'Cancel', value: null, className: 'btn btn-neutral' },
      { text: 'Apply', value: 'apply', className: 'btn primary-btn' }
    ]
  });

  if (result === 'apply') {
    const selected = document.querySelector('input[name="theme"]:checked')?.value;
    if (selected) applyTheme(selected);
  }
});

function getThemePreference() {
  return localStorage.getItem('theme-pref') || 'system';
}

function applyTheme(mode) {
  localStorage.setItem('theme-pref', mode);

  const root = document.documentElement;

  if (mode === 'light') {
    root.classList.remove('dark-theme');
  } else if (mode === 'dark') {
    root.classList.add('dark-theme');
  } else {
    // system: match media
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark-theme', systemDark);
  }
}

// Re-apply on page load
applyTheme(getThemePreference());

// Also update on system theme change if using 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemePreference() === 'system') applyTheme('system');
});

