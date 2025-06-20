import { createFlashMessage, createLoadingSpinner, openModal } from "../../../static/js/base.js";

/* ------------------------------------------------------------------ */
/* Enhance native pickers: open on any click/focus                    */
/* ------------------------------------------------------------------ */
['date', 'time'].forEach(id => {
  const input = document.getElementById(id);
  if (input && typeof input.showPicker === 'function') {
    const open = () => input.showPicker();
    input.addEventListener('focus', open);
    input.addEventListener('click', open);
  }
});

/* ------------------------------------------------------------------ */
/* Lock M-Pesa input to Kenyan format (254...)                        */
/* ------------------------------------------------------------------ */
const phoneInput = document.getElementById('phone');

if (phoneInput) {
  if (!phoneInput.value) phoneInput.value = '2547'; // Default prefix

  phoneInput.addEventListener('keydown', (e) => {
    const { key, selectionStart: s, selectionEnd: ePos } = e;
    const isDigit  = /^[0-9]$/.test(key);
    const isBacksp = key === 'Backspace';
    const isDelete = key === 'Delete';

    // Allow digits after prefix only
    if (isDigit && s >= 3) return;

    // Prevent deletion inside prefix
    if ((isBacksp && s <= 3 && s === ePos) || (isDelete && s < 3)) {
      e.preventDefault();
      return;
    }

    // Block any non-digit input
    if (key.length === 1 && !isDigit) e.preventDefault();
  });

  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    phoneInput.value = digits.startsWith('254') ? digits : '254' + digits.replace(/^254*/, '');
    if (phoneInput.value.length < 3) phoneInput.value = '254';
  });

  phoneInput.addEventListener('focus', () => {
    if (phoneInput.selectionStart < 4) phoneInput.setSelectionRange(4, 4);
  });
}

/* ------------------------------------------------------------------ */
/* Booking Form Handler                                               */
/* ------------------------------------------------------------------ */
const form = document.getElementById("bookingForm");
const btn  = document.getElementById("submitBtn");

form.addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    date:         form.date.value,
    time:         form.time.value,
    note:         form.note.value,
    phone_number: form.phone.value,
    amount:       1,
  };

  // Ask user to confirm payment details before initiating STK push
  const proceed = await openModal({
    title: 'Confirm Payment',
    html: `
      <div class="confirmation-grid">
          <div class="key">Professional:</div>
          <div class="value">Therapist</div>
          <div class="key">Duration:</div>
          <div class="value">1 hour</div>
          <div class="key">Date:</div>
          <div class="value">${payload.date}</div>
      </div>
      <div class="border"></div>
      <div class="confirmation-grid">
        <div class="key">Mpesa Number:</div>
        <div class="value">${payload.phone_number}</div>
        <div class="key">Amount:</div>
        <div class="value">KES ${payload.amount}</div>
        <div class="key">Payment Method:</div>
        <div class="value">M-Pesa (STK Push)</div>
      </div>
    `,
    actions: [
      { text: 'Cancel', value: false, className: 'btn btn-neutral' },
      { text: 'Pay',    value: true,  className: 'btn primary-btn' }
    ]
  });

  if (!proceed) return;

  // Button loading state
  btn.disabled = true;
  btn.innerText = "Initiating Payment...";
  btn.prepend(createLoadingSpinner());

  const payUrl = "/book/payment/";

  try {
    const { data } = await axios.post(payUrl, payload);

    btn.disabled = false;
    btn.innerText = "Continue to Payment";

    createFlashMessage("Check your phone for the M-Pesa prompt…", "info", true, false);

    /* -------------------------------------------------------------- */
    /* Server-Sent Events: Wait for callback update without polling   */
    /* -------------------------------------------------------------- */
    const streamUrl = `/book/payment/stream/${data.checkout_request_id}/`;
    const source = new EventSource(streamUrl);

    source.onmessage = (e) => {
      const status = JSON.parse(e.data);

      if (status.code === null) return;  // still waiting

      source.close();

      if (status.code === 0) {
        window.location.href = "/?paid=true";  // redirect with success
      } else {
        createFlashMessage(status.desc || "Payment failed.", "error", true, true);
      }
    };

    source.onerror = () => {
      source.close();
      createFlashMessage("Connection lost. Please refresh the page.", "error", true, true);
    };

  } catch (err) {
    const msg = err.response?.data?.error || "An unexpected error occurred.";
    createFlashMessage(msg, "error", true, true);
    btn.disabled  = false;
    btn.innerText = "Continue to Payment";
  }
});
