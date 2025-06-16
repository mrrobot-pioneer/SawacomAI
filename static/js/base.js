/**
 * baseUI.js
 * ──────────────────────────────────────────────────────────────────────────── *
 *
 * 1. Header
 *    • Account-icon dropdown
 *    • Dismissible global flash messages
 * 2. Sidebar
 *    • Collapse / expand (desktop)
 *    • Slide-in open / close (mobile + overlay)
 *    • `closeSidebar()` is exported *and* attached to `window` for legacy code
 * 3. getCookie()  ➜  Automatically wires CSRF header for Axios
 * 4. createFlashMessage => globally create flash messages
 * ────────────────────────────────────────────────────────────────────────────
 */

/* ------------------------------------------------------------------ */ 
/* 1 ▸ HEADER CONTROLS                                                */
/* ------------------------------------------------------------------ */
const accountIcon = document.getElementById('accountIcon');
const globalMessageCloseBtns = document.querySelectorAll('.global-messages .close-btn');

// ── account-icon dropdown ───────────────────────────────────────────
if (accountIcon) {
  accountIcon.addEventListener('click', e => {
    e.stopPropagation();
    accountIcon.classList.toggle('open');
  });

  // click anywhere else → collapse dropdown
  document.addEventListener('click', () => accountIcon.classList.remove('open'));
}

// ── dismiss flash messages ─────────────────────────────────────────
globalMessageCloseBtns.forEach(btn =>
  btn.addEventListener('click', e => {
    e.stopPropagation();
    btn.closest('.global-message')?.remove();
  })
);

/* ------------------------------------------------------------------ */
/* 2 ▸ SIDEBAR CONTROLS                                               */
/* ------------------------------------------------------------------ */
const sidebarEl   = document.querySelector('.sidebar');
const overlayEl   = document.querySelector('.sidebar-overlay');

const btn = {
  collapse: document.getElementById('sidebarCollapse'), // desktop
  expand  : document.getElementById('sidebarToggle'),   // desktop mini-icon
  close   : document.getElementById('sidebarClose')     // mobile “×”
};

// —— collapse / expand (desktop) ————————————————
function collapseSidebar() {
  sidebarEl?.classList.add('collapsed');
  if (btn.expand) btn.expand.style.display = 'flex';
}
function expandSidebar() {
  sidebarEl?.classList.remove('collapsed');
  if (btn.expand) btn.expand.style.display = 'none';
}

// —— open / close (mobile overlay) ————————————————
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

// —— wire buttons ——————————————————————————————————
btn.collapse?.addEventListener('click', collapseSidebar);
btn.expand?.addEventListener('click', () => {
  expandSidebar();   // desktop expand
  openSidebar();     // and immediately open for mobile viewports
});
btn.close?.addEventListener('click', closeSidebar);
overlayEl?.addEventListener('click', closeSidebar);

/* ------------------------------------------------------------------ */
/* 3 ▸ CSRF HELPER + AXIOS WIRING                                     */
/* ------------------------------------------------------------------ */

/**
 * Return the value of a cookie (or `null` if absent).
 * @param {string} name
 */
export function getCookie(name) {
  let value = null;
  document.cookie
    .split(';')
    .forEach(cookie => {
      const [key, val] = cookie.trim().split('=');
      if (key === name) value = decodeURIComponent(val);
    });
  return value;
}

// Attach CSRF token to all Axios requests (if Axios is present)
if (typeof axios !== 'undefined') {
  const csrf = getCookie('csrftoken');
  if (csrf) axios.defaults.headers.common['X-CSRFToken'] = csrf;
}


/* ------------------------------------------------------------------ */
/* 4 ▸ Global function to handle flash messages                                    */
/* ------------------------------------------------------------------ */

export function createFlashMessage(text, type = 'info', clearAll = false, autoDismiss = true ) {
  // 1) Ensure container
  let ul = document.querySelector('ul.global-messages');

  // 2) Clear old if requested
  if (clearAll) {
    ul.innerHTML = '';
  }

  // 3) Build the <li>
  const li = document.createElement('li');
  li.className = `global-message ${type}`;
  li.setAttribute('role', 'alert');
  li.innerHTML = `
    <span class="message-text">${text}</span>
  `;

  // 5) Add to DOM (prepend so newest on top)
  ul.prepend(li);

  // 6) Slide down
  // Allow a tick for CSS to register initial state
  requestAnimationFrame(() => li.classList.add('show'));

  // 7) Auto-dismiss after 5s
  if (autoDismiss) {
    setTimeout(() => hideAndRemove(li), 5000);
  }
}

/** Slides up a message, then removes it from the DOM */
function hideAndRemove(li) {
  li.classList.remove('show');
  li.classList.add('hide');
  li.addEventListener('transitionend', () => {
    li.remove();
  }, { once: true });
}
