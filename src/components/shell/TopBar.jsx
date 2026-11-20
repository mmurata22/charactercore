import { VIEWS } from '../../lib/constants';
import { useProject } from '../../state/ProjectContext.jsx';
import AutosaveStatus from './AutosaveStatus.jsx';
import Logo from './Logo.jsx';

export default function TopBar({ view, navOpen, onToggleNav, onSave, onExport, onOpenAutosaves }) {
  const { meta, closeProject } = useProject();
  return (
    <div className="bar">
      <button className="ham" aria-label="Open menu" aria-controls="nav" aria-expanded={navOpen} onClick={onToggleNav}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <button className="bar-home" onClick={closeProject} title="Back to all projects">
        <Logo />
      </button>
      <span className="where">
        <b>{meta.name}</b> / {VIEWS[view]}
      </span>
      <div className="bar-right">
        <AutosaveStatus onOpen={onOpenAutosaves} />
        <button onClick={onExport}>Export</button>
        <button className="pri" onClick={onSave} title="Save the whole project to one file (Ctrl+S)">Save</button>
      </div>
    </div>
  );
}
