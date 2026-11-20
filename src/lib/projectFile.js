import { normalizeProject } from './project';

/**
 * The single-file project format (.ccproj): everything in one file.
 *
 *   bytes 0–7    "CCPROJ01"
 *   bytes 8–11   manifest length N (uint32, little-endian)
 *   next N bytes manifest JSON:
 *                { app, version, savedAt, project:{id,name,createdAt}, data,
 *                  media:[{name,type,size,offset}],          ← footage
 *                  reels:[{...reel info, size, offset}],     ← finished reel videos
 *                  images:[{imageId,type,size,offset}] }     ← moodboard images
 *   rest         the video bytes back to back (offsets relative to the end of the manifest)
 *
 * Videos are stored as raw bytes (no base64), and reading slices the file lazily,
 * so even large footage doesn't have to be loaded into memory at once.
 */
const MAGIC = 'CCPROJ01';
export const PROJECT_EXT = 'ccproj';
export const PROJECT_MIME = 'application/x-charactercore';

/** media: File[] of footage. reels: [{ ...info, blob }] finished reels. images: [{ imageId, blob }] moodboard images. */
export function buildProjectFile({ meta, data, media = [], reels = [], images = [] }) {
  let offset = 0;
  const place = (size) => {
    const at = offset;
    offset += size;
    return at;
  };
  const mediaEntries = media.map((f) => ({ name: f.name, type: f.type || 'video/mp4', size: f.size, offset: place(f.size) }));
  const reelEntries = reels.map(({ blob, ...info }) => ({ ...info, size: blob.size, offset: place(blob.size) }));
  const imageEntries = images.map(({ imageId, blob }) => ({ imageId, type: blob.type, size: blob.size, offset: place(blob.size) }));
  const manifest = {
    app: 'charactercore',
    version: 3,
    savedAt: Date.now(),
    project: { id: meta.id, name: meta.name, createdAt: meta.createdAt },
    data,
    media: mediaEntries,
    reels: reelEntries,
    images: imageEntries,
  };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const head = new Uint8Array(12);
  head.set(new TextEncoder().encode(MAGIC));
  new DataView(head.buffer).setUint32(8, json.length, true);
  return new Blob([head, json, ...media, ...reels.map((r) => r.blob), ...images.map((i) => i.blob)], { type: PROJECT_MIME });
}

/** Returns { meta:{id,name,createdAt}, data, media: File[], reels: [{...info, blob}] }. Also accepts plain project JSON. */
export async function readProjectFile(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const magic = new TextDecoder().decode(head.slice(0, 8));

  if (magic !== MAGIC) {
    let data = null;
    try {
      data = normalizeProject(JSON.parse(await file.text()));
    } catch {
      /* not JSON */
    }
    if (!data) throw new Error('That file isn’t a charactercore project.');
    return { meta: { name: file.name.replace(/\.[^.]+$/, '') }, data, media: [], reels: [], images: [] };
  }

  const len = new DataView(head.buffer).getUint32(8, true);
  const manifest = JSON.parse(await file.slice(12, 12 + len).text());
  const data = normalizeProject(manifest.data);
  if (!data) throw new Error('That project file is damaged.');
  const base = 12 + len;
  const bytes = (e, type) => file.slice(base + e.offset, base + e.offset + e.size, type);
  const media = (manifest.media || []).map((m) => new File([bytes(m)], m.name, { type: m.type }));
  const reels = (manifest.reels || []).map(({ offset, ...info }) => ({ ...info, blob: bytes({ offset, size: info.size }, info.mime) }));
  const images = (manifest.images || []).map((m) => ({ imageId: m.imageId, blob: bytes(m, m.type) }));
  return { meta: manifest.project || {}, data, media, reels, images };
}
