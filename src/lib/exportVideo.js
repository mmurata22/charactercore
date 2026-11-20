import { drawCard, drawSubtitle } from './canvas';
import { EXPORT_CARD_MS } from './constants';

const MIME_TYPES = [
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

export const canRecord = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
export const pickMimeType = () => MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) || null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (el, ev) => new Promise((r) => el.addEventListener(ev, r, { once: true }));

/** Estimated output length in seconds. */
export const estimateSeconds = (clips, sources, cards) =>
  clips.reduce((s, k) => s + (sources.has(k.src) ? k.out - k.in : cards ? EXPORT_CARD_MS / 1000 : 0), 0);

/**
 * Plays the clips in real time onto `canvas` and records it with MediaRecorder.
 * Set `control.stop = true` to cancel.
 * Resolves to { cancelled, error } or { cancelled:false, blob, ext, width, height }.
 */
export async function recordReel({ clips, sources, charOf, height, subs, sound, cards, canvas, mime, control, onProgress }) {
  const H = height;
  const W = Math.round((H * 16) / 9);
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const xv = document.createElement('video');
  xv.playsInline = true;
  xv.preload = 'auto';
  const stream = canvas.captureStream(30);
  let ac = null;
  if (sound) {
    try {
      ac = new AudioContext();
      const src = ac.createMediaElementSource(xv);
      const dst = ac.createMediaStreamDestination();
      src.connect(dst);
      dst.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      ac = null;
    }
  } else xv.muted = true;

  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: H >= 1080 ? 10e6 : 6e6 });
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  let mode = 'black';
  let cur = null;
  let raf = 0;
  const paint = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (mode === 'video' && xv.videoWidth) {
      const r = Math.min(W / xv.videoWidth, H / xv.videoHeight);
      const w = xv.videoWidth * r;
      const h = xv.videoHeight * r;
      ctx.drawImage(xv, (W - w) / 2, (H - h) / 2, w, h);
    }
    if (mode === 'card' && cur) drawCard(ctx, W, H, cur, charOf(cur.char));
    if (mode === 'video' && subs && cur) drawSubtitle(ctx, W, H, cur, charOf(cur.char));
    raf = requestAnimationFrame(paint);
  };
  paint();
  rec.start(500);
  rec.pause();

  // A small poster frame for the finished-reels list, grabbed shortly after recording starts.
  let poster = null;
  let posterTimer = 0;
  const schedulePoster = () => {
    if (posterTimer) return;
    posterTimer = setTimeout(() => {
      try {
        const p = document.createElement('canvas');
        p.width = 320;
        p.height = 180;
        p.getContext('2d').drawImage(canvas, 0, 0, 320, 180);
        poster = p.toDataURL('image/jpeg', 0.7);
      } catch {
        /* ignore */
      }
    }, 400);
  };

  let error = null;
  const total = clips.length;
  try {
    for (let i = 0; i < total && !control.stop; i++) {
      const k = clips[i];
      const url = sources.get(k.src);
      cur = k;
      onProgress?.(i, total);
      if (url) {
        if (xv.dataset.u !== url) {
          xv.dataset.u = url;
          xv.src = url;
          await once(xv, 'loadedmetadata');
        }
        xv.currentTime = k.in;
        await once(xv, 'seeked');
        mode = 'video';
        if (ac && ac.state === 'suspended') await ac.resume();
        await xv.play();
        rec.resume();
        schedulePoster();
        while (!control.stop && xv.currentTime < k.out - 0.02 && !xv.ended) await sleep(15);
        rec.pause();
        xv.pause();
      } else if (cards) {
        mode = 'card';
        await sleep(60);
        rec.resume();
        schedulePoster();
        await sleep(EXPORT_CARD_MS);
        rec.pause();
      }
    }
  } catch {
    control.stop = true;
    error = 'Export stopped: one of the videos could not be played.';
  }

  const done = new Promise((r) => (rec.onstop = r));
  rec.stop();
  await done;
  cancelAnimationFrame(raf);
  stream.getTracks().forEach((t) => t.stop());
  xv.removeAttribute('src');
  if (ac) ac.close().catch(() => {});

  if (control.stop) return { cancelled: true, error };
  const blob = new Blob(chunks, { type: mime.split(';')[0] });
  return { cancelled: false, blob, ext, width: W, height: H, poster };
}
