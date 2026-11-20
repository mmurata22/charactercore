import { formatInfo, splitScenes } from '../../lib/script';

/** Static, read-only rendering of the whole script (cover + every scene) used when printing. */
export default function ScriptPrint({ script }) {
  const { title, author, cover, elements } = script;
  const sceneNo = new Map(splitScenes(elements).filter((s) => s.heading).map((s) => [s.heading.id, s.n]));
  const hasCover = title || author || cover.subtitle || cover.basedOn || cover.contact || cover.draft || cover.date;

  return (
    <div className="paper script-print">
      {hasCover && (
        <div className="cover-print">
          <div className="cover-main">
            {title && <p className="cover-title">{title}</p>}
            {cover.subtitle && <p>{cover.subtitle}</p>}
            {author && (
              <>
                <p className="cover-credit">{formatInfo(cover.format).credit}</p>
                <p>{author}</p>
              </>
            )}
            {cover.basedOn && <p className="cover-based">{cover.basedOn}</p>}
          </div>
          <div className="cover-foot">
            <p className="sl-text">{cover.contact}</p>
            <p className="cover-draft">{[cover.draft, cover.date].filter(Boolean).join('\n')}</p>
          </div>
        </div>
      )}
      <div className="script-body">
        {elements
          .filter((e) => e.text.trim())
          .map((e) =>
            e.type === 'section' ? (
              <div key={e.id} className="sl-divider">{e.text}</div>
            ) : (
              <div key={e.id} className={`sl sl-${e.type}`}>
                {sceneNo.has(e.id) && <span className="sl-no">{sceneNo.get(e.id)}</span>}
                <div className="sl-text">{e.text}</div>
              </div>
            ),
          )}
      </div>
    </div>
  );
}
