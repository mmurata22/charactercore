import { APP_NAME } from '../../lib/constants';
import { useProject } from '../../state/ProjectContext.jsx';
import Logo from './Logo.jsx';

const LINKS = [
  { view: 'reel', label: 'Character reel' },
  { view: 'script', label: 'Script' },
  { view: 'book', label: 'Character book' },
  { view: 'maps', label: 'Character maps' },
  { view: 'notes', label: 'Notes' },
];

export default function NavDrawer({ view, onClose }) {
  const { meta, closeProject } = useProject();
  return (
    <nav className="nav" id="nav" aria-label={APP_NAME}>
      <div className="nh">
        <Logo size={26} />
        <button className="ham" aria-label="Close menu" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="nav-project">{meta.name}</p>
      {LINKS.map((l) => (
        <a key={l.view} href={`#${l.view}`} aria-current={l.view === view ? 'page' : undefined}>
          {l.label}
        </a>
      ))}
      <button className="nav-home" onClick={closeProject}>← All projects</button>
    </nav>
  );
}
