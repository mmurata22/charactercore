import { SESSION_KEY } from './constants';

/**
 * Crash detection. While a project is open, localStorage holds "open:<projectId>";
 * a clean page close writes "closed". If a page load finds "open:…", that project's
 * last session ended without closing (crash, killed tab, power loss).
 * Set up once per page load (guarded on window so dev hot-reloads don't re-run it).
 */
const read = () => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};
const write = (v) => {
  try {
    localStorage.setItem(SESSION_KEY, v);
  } catch {
    /* ignore */
  }
};

if (!window.__ccSession) {
  const prev = read();
  window.__ccSession = { crashed: prev?.startsWith('open:') ? prev.slice(5) : null, current: 'home' };
  write('home');
  addEventListener('pagehide', () => write('closed'));
  addEventListener('pageshow', (e) => e.persisted && write(window.__ccSession.current));
}

export const crashedProjectId = () => window.__ccSession.crashed;
export const clearCrash = () => (window.__ccSession.crashed = null);
export function markProjectOpen(id) {
  window.__ccSession.current = id ? `open:${id}` : 'home';
  write(window.__ccSession.current);
}
