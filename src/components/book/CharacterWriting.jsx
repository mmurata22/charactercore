import { useLayoutEffect, useRef } from 'react';
import { plural } from '../../lib/format';

/** A page of free writing about one character: backstory drafts, voice exercises, anything. */
export default function CharacterWriting({ character: c, onChange }) {
  const ref = useRef(null);
  const words = c.writing.trim() ? c.writing.trim().split(/\s+/).length : 0;

  // Grow with the text so the whole page scrolls, not a little box.
  useLayoutEffect(() => {
    const t = ref.current;
    t.style.height = 'auto';
    t.style.height = Math.max(t.scrollHeight, 420) + 'px';
  }, [c.writing]);

  return (
    <section className="panel writing">
      <div className="writing-head">
        <h2>Writing about {c.name}</h2>
        <span className="writing-count">{plural(words, 'word')} · saved as you type</span>
      </div>
      <textarea
        ref={ref}
        className="writing-page"
        aria-label={`Writing about ${c.name}`}
        value={c.writing}
        placeholder={`Write anything about ${c.name}: a day in their life, a letter in their voice, what they’d never admit…`}
        onChange={(e) => onChange({ writing: e.target.value })}
      />
    </section>
  );
}
