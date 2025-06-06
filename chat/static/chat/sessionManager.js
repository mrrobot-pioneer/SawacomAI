/**
 * sessionManager.js
 * – Single source of truth for the *active* chat session
 * – Publishes changes to interested UI modules
 * – Provides thin wrappers around the Django endpoints
 */

const listeners = new Set();                 // simple pub-sub
let sessionId = null;                      // private state

/* ------------------------------------------------------------------ */
/*  Public getters / setters                                           */
/* ------------------------------------------------------------------ */
export function getSessionId()     { return sessionId; }
export function setSessionId(id) {
  if (id === sessionId) return;
  sessionId = id;
  listeners.forEach(fn => fn(id));           // notify subscribers
}

/* ------------------------------------------------------------------ */
/*  Subscribe / unsubscribe                                            */
/* ------------------------------------------------------------------ */
export function onSessionChange(fn)  { listeners.add(fn); }
export function offSessionChange(fn) { listeners.delete(fn); }
