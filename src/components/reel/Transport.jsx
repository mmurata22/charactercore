import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../lib/format';

/**
 * Play button, scrub bar (with the marked in/out range) and time readout.
 * Polls the video each animation frame; the time text and scrub position are
 * written straight to the DOM so playback doesn't re-render React 60×/s.
 */
export default function Transport({ videoRef, markIn, markOut, showRange, onTogglePlay }) {
  const scrubRef = useRef(null);
  const timeRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    let raf;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        const d = v.duration || 0;
        const t = v.currentTime || 0;
        timeRef.current.textContent = `${fmt(t)} / ${fmt(d)}`;
        if (document.activeElement !== scrubRef.current) scrubRef.current.value = t;
        setDuration(d);
        setPaused(v.paused);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  const rangeVisible = showRange && duration > 0 && markIn != null;
  const end = markOut ?? markIn;

  return (
    <div className="trans">
      <button aria-label="Play or pause" onClick={onTogglePlay}>
        {paused ? 'Play' : 'Pause'}
      </button>
      <div className="tl">
        {rangeVisible && (
          <div
            className="rg"
            style={{ left: `${(markIn / duration) * 100}%`, width: `${(Math.max(0, end - markIn) / duration) * 100}%` }}
          />
        )}
        <input
          ref={scrubRef}
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          defaultValue="0"
          aria-label="Scrub"
          onChange={(e) => {
            const v = videoRef.current;
            if (v?.getAttribute('src')) v.currentTime = +e.target.value;
          }}
        />
      </div>
      <span className="time" ref={timeRef}>0:00.0 / 0:00.0</span>
    </div>
  );
}
