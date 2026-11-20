import { ELEMENT_TYPES } from '../../lib/script';

export default function ScriptToolbar({ currentType, onType, onNewScene, onComment, canComment, onPrint, onDownload, pages }) {
  return (
    <div className="script-toolbar">
      <label className="sr-only" htmlFor="elType">Element type</label>
      <select id="elType" value={currentType ?? ''} disabled={!currentType} onChange={(e) => onType(e.target.value)}>
        {!currentType && <option value="">Click into the script</option>}
        {ELEMENT_TYPES.map((t, i) => (
          <option key={t.key} value={t.key}>
            {t.label} (Ctrl+{i + 1})
          </option>
        ))}
      </select>
      <button onClick={onNewScene}>New scene</button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={onComment} disabled={!canComment}
        title="Select text in the script, then comment on it (Ctrl+Alt+M)">
        Comment
      </button>
      <span className="script-hint">
        <span className="kbd">Enter</span> next element · <span className="kbd">Tab</span> change type ·{' '}
        <span className="kbd">Shift+Enter</span> line break
      </span>
      <span className="script-tools-end">
        <span className="script-hint">≈ {pages} {pages === 1 ? 'page' : 'pages'}</span>
        <button onClick={onPrint}>Print / PDF</button>
        <button onClick={onDownload}>Download .fountain</button>
      </span>
    </div>
  );
}
