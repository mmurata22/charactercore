import { withStore } from './db';
import { LIVE_KEY, LEGACY_PROJECT_KEY } from './constants';
import { uid } from './format';
import { blankProject, isEmptyProject, normalizeProject, readLegacyProject, summarizeProject } from './project';

/**
 * Projects live in IndexedDB (lots of room). The open project is also mirrored to
 * localStorage on every change ("live" copy) because that write is synchronous and
 * survives a crash or a tab closing mid-save; on open, whichever copy is newer wins.
 */
const STORE = 'projects';

export const newProjectId = () => uid() + uid();

export function newProjectRecord(name, data = blankProject(), id = newProjectId()) {
  const now = Date.now();
  return { id, name, createdAt: now, updatedAt: now, includeFootage: true, summary: summarizeProject(data), data };
}

/** All projects, most recently edited first, without their data. */
export async function listProjects() {
  const all = (await withStore(STORE, 'readonly', (s) => s.getAll())) || [];
  return all.map(({ data, ...meta }) => meta).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getProjectRecord = (id) => withStore(STORE, 'readonly', (s) => s.get(id));
export const putProjectRecord = (record) => withStore(STORE, 'readwrite', (s) => s.put(record));
export async function deleteProjectRecord(id) {
  await withStore(STORE, 'readwrite', (s) => s.delete(id));
  if (readLive(id)) clearLive();
}

/** Load a project for opening, preferring the live copy if it's newer. Data is normalized. */
export async function loadProjectRecord(id) {
  const rec = await getProjectRecord(id);
  if (!rec) return null;
  const live = readLive(id);
  const data = live && live.updatedAt > rec.updatedAt ? live.data : rec.data;
  return { ...rec, data: normalizeProject(data) || blankProject() };
}

// ---- live copy of the open project ----
export function writeLive(id, data, updatedAt) {
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify({ id, updatedAt, data }));
  } catch {
    /* too big for localStorage: IndexedDB still has it */
  }
}
function readLive(id) {
  try {
    const v = JSON.parse(localStorage.getItem(LIVE_KEY));
    return v && v.id === id ? v : null;
  } catch {
    return null;
  }
}
function clearLive() {
  try {
    localStorage.removeItem(LIVE_KEY);
  } catch {
    /* ignore */
  }
}

// ---- one-time migration of the single project older versions kept ----
export const legacyProjectId = () => {
  try {
    return localStorage.getItem(LEGACY_PROJECT_KEY);
  } catch {
    return null;
  }
};

let migration = null;
/** If there are no projects yet but the old single-project save has content, make it a project. */
export function migrateLegacy() {
  migration ??= (async () => {
    if (legacyProjectId()) return;
    const existing = await listProjects();
    const legacy = readLegacyProject();
    if (existing.length || !legacy || isEmptyProject(legacy)) return;
    const rec = newProjectRecord(legacy.script.title.trim() || 'My project', legacy);
    await putProjectRecord(rec);
    try {
      localStorage.setItem(LEGACY_PROJECT_KEY, rec.id);
    } catch {
      /* ignore */
    }
  })();
  return migration;
}
