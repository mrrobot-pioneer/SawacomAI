/*** Header and Sidebar functionalty ****/

// Grab the account icon (if it exists for logged-in users)
const accountIcon = document.getElementById('accountIcon');

if (accountIcon) {
  // account dropdown toggle
  accountIcon.addEventListener('click', e => {
    e.stopPropagation();
    accountIcon.classList.toggle('open');
  });

  // close account dropdown when clicking outside
  document.addEventListener('click', () => {
    accountIcon.classList.remove('open');
  });
}

// close messsage
document
  .querySelectorAll('.global-messages .close-btn')
  .forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.closest('.global-message').remove();
    });
});


// Sidebar toggle functionality for both mobile and desktop 

const sidebar = document.querySelector('.sidebar');
const sidebarCollapse = document.getElementById('sidebarCollapse');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const overlay = document.querySelector(".sidebar-overlay");

// --- Sidebar Toggle Logic ---

function collapseSidebar() {
    sidebar.classList.add('collapsed');
    sidebarToggle.style.display = 'flex';
}

function expandSidebar() {
    sidebar.classList.remove('collapsed');
    sidebarToggle.style.display = 'none';
}

function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
}

// Desktop: Collapse/Expand sidebar
if (sidebarCollapse) {
    sidebarCollapse.addEventListener('click', collapseSidebar);
}

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', expandSidebar);
    sidebarToggle.addEventListener('click', openSidebar); // for mobile as well
}

// Mobile: Close sidebar
if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
}

if (overlay) {
    overlay.addEventListener("click", closeSidebar);
}

