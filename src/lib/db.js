/**
 * The app's IndexedDB database.
 *   projects  — one record per project: { id, name, createdAt, updatedAt, summary, includeFootage, data }
 *   autosaves — snapshot history: { id, projectId, at, reason, summary, size, data }
 *   reels     — finished reel videos: { id, projectId, name, createdAt, size, mime, ext, ..., blob }
 *   images    — moodboard images: { id: '<projectId>:<imageId>', projectId, imageId, type, blob }
 */
const DB_NAME = 'charactercore';
const VERSION = 4;
const STORES = ['autosaves', 'projects', 'reels', 'images'];
let dbPromise = null;

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close(); // let a newer tab upgrade
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Close other charactercore tabs and reload.'));
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

/** Run `fn(objectStore)` in a transaction; resolves with the request's result once committed. */
export async function withStore(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
