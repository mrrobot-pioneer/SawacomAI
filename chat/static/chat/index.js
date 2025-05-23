/** This file contains the JavaScript code for the chatbot functionality. **/

// welcome subtext animation
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
    }, 500); // wait for exit animation
}
  
setInterval(rotateSubtext, 3500);
  

// chat input
const textarea = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

textarea.focus();

textarea.addEventListener('input', () => {
    textarea.style.height = 'auto'; // Reset
    textarea.style.height = textarea.scrollHeight + 'px'; // Adjust

    sendButton.disabled = textarea.value.trim() === '';
});
