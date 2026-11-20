import { withStore } from './db';
import { uid } from './format';

/**
 * Moodboard images, kept per project in IndexedDB. Project data refers to them by `imageId`;
 * the record key is "<projectId>:<imageId>", so copying a project keeps the same image ids.
 */
const STORE = 'images';
const MAX_SIDE = 2400;
const key = (projectId, imageId) => `${projectId}:${imageId}`;

/** Shrink very large photos so a moodboard doesn't fill up browser storage. */
async function shrink(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1) return file;
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * scale);
    cv.height = Math.round(bmp.height * scale);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return await new Promise((r) => cv.toBlob((b) => r(b || file), type, 0.9));
  } catch {
    return file;
  }
}

export async function addImage(projectId, file) {
  const blob = await shrink(file);
  const imageId = uid() + uid();
  await withStore(STORE, 'readwrite', (s) => s.put({ id: key(projectId, imageId), projectId, imageId, type: blob.type, blob }));
  return imageId;
}

export const putImageRecord = (projectId, imageId, blob) =>
  withStore(STORE, 'readwrite', (s) => s.put({ id: key(projectId, imageId), projectId, imageId, type: blob.type, blob }));

export const getImage = (projectId, imageId) => withStore(STORE, 'readonly', (s) => s.get(key(projectId, imageId)));
export const deleteImage = (projectId, imageId) => withStore(STORE, 'readwrite', (s) => s.delete(key(projectId, imageId)));

export async function listProjectImages(projectId) {
  const all = (await withStore(STORE, 'readonly', (s) => s.getAll())) || [];
  return all.filter((r) => r.projectId === projectId);
}

export async function deleteProjectImages(projectId) {
  const list = await listProjectImages(projectId);
  if (list.length) await withStore(STORE, 'readwrite', (s) => list.forEach((r) => s.delete(r.id)));
}

export async function copyProjectImages(fromId, toId) {
  for (const r of await listProjectImages(fromId)) await putImageRecord(toId, r.imageId, r.blob);
}
