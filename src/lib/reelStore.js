import { withStore } from './db';
import { uid } from './format';

/**
 * Finished reels: every exported reel video is kept here (IndexedDB holds the video itself).
 * Record: { id, projectId, name, createdAt, size, mime, ext, scope, height, clipCount, duration, fileName, poster, blob }
 */
const STORE = 'reels';
export const newReelId = () => uid() + uid();

/** A project's finished reels, newest first, without the video data. */
export async function listReels(projectId) {
  const all = (await withStore(STORE, 'readonly', (s) => s.getAll())) || [];
  return all
    .filter((r) => r.projectId === projectId)
    .map(({ blob, ...meta }) => meta)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export const getReel = (id) => withStore(STORE, 'readonly', (s) => s.get(id));
export const putReel = (rec) => withStore(STORE, 'readwrite', (s) => s.put(rec));
export const deleteReel = (id) => withStore(STORE, 'readwrite', (s) => s.delete(id));

export async function deleteProjectReels(projectId) {
  const list = await listReels(projectId);
  if (list.length) await withStore(STORE, 'readwrite', (s) => list.forEach((r) => s.delete(r.id)));
}

export async function copyProjectReels(fromId, toId) {
  for (const meta of await listReels(fromId)) {
    const r = await getReel(meta.id);
    if (r) await putReel({ ...r, id: newReelId(), projectId: toId });
  }
}
