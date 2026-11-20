import { withStore } from './db';
import { legacyProjectId } from './projectStore';

const STORE = 'autosaves';

/** Autosaves made before projects existed belong to the project migrated from that data. */
const belongsTo = (a, projectId) => a.projectId === projectId || (!a.projectId && projectId === legacyProjectId());

/** A project's autosaves, newest first, without the (large) project data. */
export async function listAutosaves(projectId) {
  const all = (await withStore(STORE, 'readonly', (s) => s.getAll())) || [];
  return all
    .filter((a) => belongsTo(a, projectId))
    .map(({ data, ...meta }) => meta)
    .sort((a, b) => b.at - a.at);
}

export const getAutosave = (id) => withStore(STORE, 'readonly', (s) => s.get(id));
export const putAutosave = (entry) => withStore(STORE, 'readwrite', (s) => s.put(entry));

export async function pruneAutosaves(projectId, keep) {
  const old = (await listAutosaves(projectId)).slice(keep);
  if (old.length) await withStore(STORE, 'readwrite', (s) => old.forEach((o) => s.delete(o.id)));
}

export async function deleteProjectAutosaves(projectId) {
  const all = await listAutosaves(projectId);
  if (all.length) await withStore(STORE, 'readwrite', (s) => all.forEach((o) => s.delete(o.id)));
}
