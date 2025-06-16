import { createFlashMessage } from "../../../static/js/base.js";

const form     = document.getElementById("bookingForm");
const btn      = document.getElementById("submitBtn");
const { payUrl, statusUrl } = form.dataset;

// how long we'll give M-Pesa to respond (ms)
const MAX_WAIT   = 3 * 60_000;   // 3 minutes
const POLL_EVERY = 5_000;        // poll every 5s

form.addEventListener("submit", async e => {
  e.preventDefault();
  btn.disabled = true;

  // 1) Kick off initial payment
  createFlashMessage("Initiating payment…", "info", true, false);

  const payload = {
    date:         form.date.value,
    time:         form.time.value,
    note:         form.note.value,
    phone_number: form.phone.value,
  };

  try {
    const { data } = await axios.post(payUrl, payload);

    if (!data.success) {
      // clear old flashes, show this error, auto-dismiss
      createFlashMessage(data.error, "error", true, true);
      btn.disabled = false;
      return;
    }

    createFlashMessage(
      "Check your phone for the M-Pesa prompt…",
      "info",
      true,
      false       // sticky until replaced
    );

    // 2) Poll loop
    const start = Date.now();
    const intervalId = setInterval(async () => {
      // bail if we've waited too long
      if (Date.now() - start >= MAX_WAIT) {
        clearInterval(intervalId);
        createFlashMessage(
          "⌛ Payment is still processing. Please try again later.",
          "error",
          true,
          true
        );
        btn.disabled = false;
        return;
      }

      try {
        const { data: status } = await axios.get(statusUrl, {
          params: { checkout_request_id: data.checkout_request_id }
        });

        // still pending → keep polling
        if (status.code === null) return;

        clearInterval(intervalId);

        if (status.code === 0) {
          createFlashMessage(
            status.desc || "Payment confirmed!",
            "success",
            true,
            true
          );
        } else {
          createFlashMessage(
            status.desc || "Payment failed.",
            "error",
            true,
            true
          );
        }
      } catch (err) {
        clearInterval(intervalId);
        createFlashMessage(
          "Could not fetch payment status. Please check your connection.",
          "error",
          true,
          true
        );
      } finally {
        btn.disabled = false;
      }
    }, POLL_EVERY);

  } catch (err) {
    // network or server error on initial STK push
    const msg = err.response?.data?.error
      || "An unexpected error occurred.";
    createFlashMessage(msg, "error", true, true);
    btn.disabled = false;
  }
});
