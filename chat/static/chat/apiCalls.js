/**
 * apiCalls.js
 * ---------------------------------------------------------------------------
 * Thin, promise‑based wrappers around every REST endpoint the chat UI needs.
 * No DOM, no state – just HTTP ⇄ JSON.
 * ---------------------------------------------------------------------------
 *   All functions return a *clean* promise that resolves to `response.data`
 *   (or to nothing for DELETE) so UI layers don’t have to touch Axios objects.
 * ---------------------------------------------------------------------------
 */

/* global axios */

// • GET /chat-sessions/ ------------------------------------------------------
export const fetchSessions = () =>
    axios.get('/chat-sessions/').then(r => r.data);
  
  // • GET /chat-sessions/:id/messages/ ----------------------------------------
  export const fetchMessages = sessionId =>
    axios.get(`/chat-sessions/${sessionId}/messages/`).then(r => r.data);
  
  // • POST /simulate/ ---------------------------------------------------------
  export const simulateBot = payload =>
    axios.post('/simulate/', payload).then(r => r.data);
  
  // • DELETE /chat-sessions/:id/delete/ ---------------------------------------
  export const deleteSession = sessionId =>
    axios.delete(`/chat-sessisons/${sessionId}/delete/`);
  
  // • PATCH /chat-sessions/:id/rename/ ----------------------------------------
  export const renameSession = (sessionId, title) =>
    axios.patch(`/chat-sessions/${sessionId}/rename/`, { title });
  