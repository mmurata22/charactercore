import { useEffect, useRef } from 'react';
import { useEscape } from '../../hooks/useEscape';
import ClipCard from '../reel/ClipCard.jsx';

/** Selected clips looping together, muted; clicking one toggles its sound. */
export default function CompareModal({ clips, charOf, sources, onClose }) {
  const vids = useRef([]);
  const closeRef = useRef(null);

  const close = () => {
    vids.current.forEach((x) => {
      if (!x) return;
      x.pause();
      x.removeAttribute('src');
    });
    onClose();
  };
  useEscape(close);

  useEffect(() => {
    closeRef.current?.focus();
    let raf;
    const loop = () => {
      for (const x of vids.current) {
        if (x && x.currentTime >= +x.dataset.out) {
          x.currentTime = +x.dataset.in;
          x.play().catch(() => {});
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playAll = () =>
    vids.current.forEach((x) => {
      if (!x) return;
      x.currentTime = +x.dataset.in;
      x.play().catch(() => {});
    });

  const toggleSound = (i) => {
    const x = vids.current[i];
    if (!x) return;
    const was = x.muted;
    vids.current.forEach((y) => y && (y.muted = true));
    x.muted = !was;
  };

  return (
    <div className="modal">
      <div className="sheet">
        <div className="hd">
          <h2>Side by side</h2>
          <div className="btns">
            <button className="pri" onClick={playAll}>Play all from the top</button>
            <button ref={closeRef} onClick={close}>Close</button>
          </div>
        </div>
        <p className="lead">Clips loop together, muted. Click one to hear it.</p>
        <div className="cmpg">
          {clips.map((k, i) => {
            const c = charOf(k.char);
            const url = sources.get(k.src);
            return (
              <figure key={k.id}>
                <div className="mon" onClick={() => toggleSound(i)}>
                  {url ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          el.muted = true;
                          vids.current[i] = el;
                        }
                      }}
                      muted
                      playsInline
                      src={url}
                      data-in={k.in}
                      data-out={k.out}
                      onLoadedMetadata={(e) => {
                        const x = e.currentTarget;
                        x.currentTime = k.in;
                        x.play().catch(() => {});
                      }}
                    />
                  ) : (
                    <ClipCard clip={k} char={c} showCaption={false} />
                  )}
                </div>
                <figcaption>
                  <b style={{ color: c.color }}>{c.name}</b>
                  {k.cap}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
