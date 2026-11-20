/**
 * Cross-view jump: ask the script view to open an element (and optionally select a range
 * in it, e.g. a note's highlight) once it mounts.
 */
let pendingScriptFocus = null; // { id, start?, end? }

export function goToScriptElement(id, range) {
  pendingScriptFocus = { id, ...range };
  if (location.hash === '#script') dispatchEvent(new Event('cc-script-focus'));
  else location.hash = '#script';
}

export const peekPendingScriptFocus = () => pendingScriptFocus;
export const clearPendingScriptFocus = () => (pendingScriptFocus = null);

/** Open the script page and print the whole script (cover + every scene) once it's shown. */
let pendingPrint = false;
export function requestScriptPrint() {
  pendingPrint = true;
  if (location.hash === '#script') dispatchEvent(new Event('cc-print-script'));
  else location.hash = '#script';
}
export function takePendingPrint() {
  const p = pendingPrint;
  pendingPrint = false;
  return p;
}
