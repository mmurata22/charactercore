import { useEffect, useRef, useState } from 'react';
import { CARD_MS } from '../lib/constants';

/**
 * Drives the monitor's <video> element: loading footage, reel playback
 * (clip after clip, with text cards for missing footage), and cut preview.
 *
 * `getEditor()` must return the current editor state ({ src, in, out }) so that
 * stopping the reel can return the monitor to whatever is being edited.
 */
export function useMonitorPlayer({ sources, getEditor }) {
  const videoRef = useRef(null);
  const [screen, setScreen] = useState({ card: null, sub: null, empty: true });
  const [reelPos, setReelPos] = useState(null); // { i, total } while the reel plays
  const reelRef = useRef(null);
  const previewRef = useRef(false);
  const editorRef = useRef(getEditor);
  editorRef.current = getEditor;
  /** Latest versions of the functions below, for use from timers and rAF. */
  const api = useRef({});

  const video = () => videoRef.current;

  function setVideo(url, onReady) {
    const v = video();
    setScreen((s) => ({ ...s, card: null, empty: false }));
    if (v.dataset.u !== url) {
      v.dataset.u = url;
      v.src = url;
      v.addEventListener('loadedmetadata', () => onReady?.(), { once: true });
    } else onReady?.();
  }

  function showCard(clip) {
    video().pause();
    setScreen({ card: clip, sub: null, empty: false });
  }

  function showNothing() {
    video().pause();
    const ed = editorRef.current();
    setScreen({ card: null, sub: null, empty: !(ed.src && sources.has(ed.src)) });
  }

  /** Put the editor's footage back on the monitor at its mark-in point. */
  function showEditorSource() {
    const ed = editorRef.current();
    if (ed.src && sources.has(ed.src)) {
      setVideo(sources.get(ed.src), () => {
        const t = editorRef.current().in;
        if (t != null) video().currentTime = t;
      });
    } else showNothing();
  }

  function stopReel() {
    const r = reelRef.current;
    if (!r) return;
    clearTimeout(r.timer);
    reelRef.current = null;
    setReelPos(null);
    video().pause();
    setScreen((s) => ({ ...s, sub: null, card: null }));
    showEditorSource();
  }

  function nextClip() {
    const r = reelRef.current;
    if (!r) return;
    clearTimeout(r.timer);
    r.i++;
    if (r.i >= r.list.length) {
      stopReel();
      return;
    }
    const k = r.list[r.i];
    setReelPos({ i: r.i, total: r.list.length });
    r.cur = null;
    const url = sources.get(k.src);
    if (!url) {
      showCard(k);
      r.timer = setTimeout(() => api.current.nextClip(), CARD_MS);
      return;
    }
    setScreen({ card: null, sub: k, empty: false });
    setVideo(url, () => {
      video().currentTime = k.in;
      if (reelRef.current === r) r.cur = k;
      video().play().catch(() => {});
    });
  }

  function playReel(list) {
    if (!list.length) return;
    if (reelRef.current) clearTimeout(reelRef.current.timer);
    previewRef.current = false;
    reelRef.current = { list, i: -1, timer: 0, cur: null };
    nextClip();
  }

  function previewCut(from) {
    previewRef.current = true;
    video().currentTime = from;
    video().play().catch(() => {});
  }

  const hasFootage = () => !!video()?.getAttribute('src');

  function togglePlay() {
    const v = video();
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function seekBy(dt, pause) {
    const v = video();
    if (pause) v.pause();
    v.currentTime = Math.min(v.duration || 0, Math.max(0, v.currentTime + dt));
  }

  api.current = { nextClip };

  // Stop at mark-out during preview, and advance the reel at each clip's out point.
  useEffect(() => {
    let raf;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        const t = v.currentTime;
        const out = editorRef.current().out;
        if (previewRef.current && out != null && t >= out) {
          v.pause();
          previewRef.current = false;
        }
        const r = reelRef.current;
        if (r && r.cur && !v.paused && t >= r.cur.out - 0.03) api.current.nextClip();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return {
    videoRef,
    screen,
    reelPos,
    isReeling: () => !!reelRef.current,
    setVideo,
    showCard,
    stopReel,
    nextClip,
    playReel,
    previewCut,
    hasFootage,
    togglePlay,
    seekBy,
    pause: () => video()?.pause(),
  };
}
