import { useLayoutEffect, useRef, useState } from 'react';
import { typeInfo } from '../../lib/script';

/** The element's text with note highlights, drawn behind the (transparent) textarea. */
function Highlights({ text, marks }) {
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const parts = [];
  let at = 0;
  for (const m of sorted) {
    const start = Math.max(m.start, at);
    if (m.end <= start) continue; // overlapping highlight: already covered
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={m.id} className={m.active ? 'on' : ''} style={{ '--hl': m.color }}>
        {text.slice(start, m.end)}
      </mark>,
    );
    at = m.end;
  }
  parts.push(text.slice(at) + '​');
  return <div className="sl-hl" aria-hidden="true">{parts}</div>;
}

/**
 * One screenplay element: an auto-growing textarea styled by its type.
 * Character cues get a colour dot (when they match the book) and name suggestions.
 * Selecting text offers a Comment button in the margin; notes show as highlights.
 */
export default function ScriptLine({
  el, sceneNo, cueColor, active, suggestions, layoutTick, register, onText, onKeyDown, onFocus, onPick,
  marks = [], hasSelection, onSelectText, onComment, onNotesClick,
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  const info = typeInfo(el.type);

  useLayoutEffect(() => {
    const t = ref.current;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }, [el.text, el.type, layoutTick]);

  return (
    <div className={`sl sl-${el.type}`}>
      {sceneNo != null && <span className="sl-no" aria-hidden="true">{sceneNo}</span>}
      {cueColor && <i className="sl-dot" style={{ background: cueColor }} aria-hidden="true" />}
      <div className="sl-field">
        {marks.length > 0 && <Highlights text={el.text} marks={marks} />}
        <textarea
          ref={(n) => {
            ref.current = n;
            register(el.id, n);
          }}
          rows={1}
          value={el.text}
          placeholder={info.placeholder}
          aria-label={info.label}
          spellCheck
          onChange={(e) => onText(el, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, el)}
          onSelect={(e) => onSelectText(el, e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
          onFocus={() => {
            setFocused(true);
            onFocus(el.id);
          }}
          onBlur={() => setFocused(false)}
        />
      </div>

      {(hasSelection || marks.length > 0) && (
        <div className="sl-margin">
          {hasSelection && (
            <button type="button" className="sl-comment" onMouseDown={(e) => e.preventDefault()} onClick={onComment}
              title="Comment on the selected text (Ctrl+Alt+M)">
              Comment
            </button>
          )}
          {marks.length > 0 && !hasSelection && (
            <button type="button" className="sl-badge" onClick={() => onNotesClick(el)} aria-label={`${marks.length} note${marks.length === 1 ? '' : 's'} on this line`}>
              {marks.length}
            </button>
          )}
        </div>
      )}

      {active && focused && suggestions.length > 0 && (
        <div className="sl-sug" role="listbox" aria-label="Characters">
          {suggestions.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === 0}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the cue
                onPick(el, c);
              }}
            >
              <i style={{ background: c.color }} />
              {c.name}
              {i === 0 && <span className="kbd">Enter</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
