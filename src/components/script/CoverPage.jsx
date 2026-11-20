import { FORMATS, formatInfo } from '../../lib/script';

/** The project's cover page (the title of the movie, book or play), edited in place. */
export default function CoverPage({ script, onChange }) {
  const { title, author, cover } = script;
  const setCover = (patch) => onChange({ cover: { ...cover, ...patch } });

  return (
    <>
      <div className="cover-tools">
        <label htmlFor="coverFormat">Format</label>
        <select id="coverFormat" value={cover.format} onChange={(e) => setCover({ format: e.target.value })}>
          {FORMATS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <span className="script-hint">This page opens the printed script and the .fountain file.</span>
      </div>

      <div className="paper cover">
        <div className="cover-main">
          <input type="text" className="cover-title" value={title} placeholder="UNTITLED" aria-label="Title"
            onChange={(e) => onChange({ title: e.target.value })} />
          <input type="text" value={cover.subtitle} placeholder="Subtitle or episode title (optional)" aria-label="Subtitle"
            onChange={(e) => setCover({ subtitle: e.target.value })} />
          <p className="cover-credit">{formatInfo(cover.format).credit}</p>
          <input type="text" value={author} placeholder="Your name" aria-label="Author"
            onChange={(e) => onChange({ author: e.target.value })} />
          <input type="text" className="cover-based" value={cover.basedOn} placeholder="Based on… (optional)"
            aria-label="Based on" onChange={(e) => setCover({ basedOn: e.target.value })} />
        </div>

        <div className="cover-foot">
          <textarea rows={4} value={cover.contact} placeholder={'Contact\nname@example.com\n555 0100'} aria-label="Contact"
            onChange={(e) => setCover({ contact: e.target.value })} />
          <div className="cover-draft">
            <input type="text" value={cover.draft} placeholder="First draft" aria-label="Draft"
              onChange={(e) => setCover({ draft: e.target.value })} />
            <input type="text" value={cover.date} placeholder="Date" aria-label="Draft date"
              onChange={(e) => setCover({ date: e.target.value })} />
          </div>
        </div>
      </div>
    </>
  );
}
