import { useEffect, useId, useRef, useState } from 'react';
import { COLOR_SWATCHES } from '../../lib/constants';

const toHex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#888888');

/**
 * Pick a colour from a ready-made list or from the colour wheel (the browser's colour picker).
 * `compact` shows just the current colour as a button that opens the picker in a popover.
 */
export default function ColorPicker({ value, onChange, label = 'Colour', compact = false }) {
  const name = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = toHex(value).toLowerCase();
  const isCustom = !COLOR_SWATCHES.includes(current);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const panel = (
    <div className="cp">
      <div className="sws" role="radiogroup" aria-label={label}>
        {COLOR_SWATCHES.map((c, i) => (
          <label key={c} title={c}>
            <input type="radio" name={name} checked={c === current} onChange={() => onChange(c)} aria-label={`${label} ${i + 1}`} />
            <span style={{ background: c }} />
          </label>
        ))}
        <label className="cp-wheel" title="Any colour (colour wheel)">
          <input type="color" value={current} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: any colour`} />
          <span className={isCustom ? 'on' : ''} style={isCustom ? { '--custom': current } : undefined} />
        </label>
      </div>
    </div>
  );

  if (!compact) return panel;
  return (
    <div className="cp-compact" ref={rootRef}>
      <button type="button" className="cp-btn" aria-expanded={open} aria-label={`${label}: change`} onClick={() => setOpen((o) => !o)}>
        <i style={{ background: current }} />
      </button>
      {open && <div className="cp-pop">{panel}</div>}
    </div>
  );
}
