import { useEffect, useState } from 'react';
import { APP_NAME, NAV_KEY, VIEWS, WIDE_QUERY } from '../lib/constants';
import { useHashView } from '../hooks/useHashView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useProject } from '../state/ProjectContext.jsx';
import NavDrawer from './shell/NavDrawer.jsx';
import TopBar from './shell/TopBar.jsx';
import Toast from './shell/Toast.jsx';
import RecoveryBanner from './shell/RecoveryBanner.jsx';
import AutosaveModal from './shell/AutosaveModal.jsx';
import SaveModal from './shell/SaveModal.jsx';
import ExportsModal from './shell/ExportsModal.jsx';
import ExportModal from './modals/ExportModal.jsx';
import ReelView from './reel/ReelView.jsx';
import ScriptView from './script/ScriptView.jsx';
import BookView from './book/BookView.jsx';
import MapsPage from './book/maps/MapsPage.jsx';
import NotesView from './notes/NotesView.jsx';

function initialNavOpen() {
  if (!matchMedia(WIDE_QUERY).matches) return false;
  try {
    const n = localStorage.getItem(NAV_KEY);
    if (n !== null) return n === '1';
  } catch {
    /* ignore */
  }
  return true;
}

/** Everything inside an open project: menu, top bar, the three views, and project-wide dialogs. */
export default function Workspace() {
  const { project, meta, media, saveToFile, hasFileHandle, storageError } = useProject();
  const view = useHashView();
  const wide = useMediaQuery(WIDE_QUERY);
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  const [modal, setModal] = useState(null); // 'autosaves' | 'save' | 'exports' | 'reel'

  const setNav = (open, remember) => {
    setNavOpen(open);
    if (remember) {
      try {
        localStorage.setItem(NAV_KEY, open ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    document.title = `${meta.name} · ${VIEWS[view]} · ${APP_NAME}`;
    if (!matchMedia(WIDE_QUERY).matches) setNavOpen(false);
  }, [view, meta.name]);

  /** Save: straight to the same file if we already have one, otherwise ask where/how. */
  const quickSave = () => (hasFileHandle ? saveToFile() : setModal('save'));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        quickSave();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const charOf = (id) => project.chars.find((c) => c.id === id) || { name: '?', color: '#888' };

  return (
    <div className={navOpen ? 'nav-open' : undefined}>
      <NavDrawer view={view} onClose={() => setNav(false, true)} />
      <div className="scrim" hidden={!navOpen || wide} onClick={() => setNav(false, true)} />

      <div className="app">
        <TopBar
          view={view}
          navOpen={navOpen}
          onToggleNav={() => setNav(!navOpen, true)}
          onSave={quickSave}
          onExport={() => setModal('exports')}
          onOpenAutosaves={() => setModal('autosaves')}
        />
        <RecoveryBanner onShowAll={() => setModal('autosaves')} />
        {storageError && <div className="recovery" role="alert">{storageError}</div>}
        {/* The reel stays mounted while hidden so loaded footage and the monitor survive view switches. */}
        <ReelView active={view === 'reel'} nav={{ open: navOpen, wide, close: () => setNav(false) }} />
        {view === 'script' && <ScriptView />}
        {view === 'book' && <BookView />}
        {view === 'maps' && <MapsPage />}
        {view === 'notes' && <NotesView />}
      </div>

      {modal === 'autosaves' && <AutosaveModal onClose={() => setModal(null)} />}
      {modal === 'save' && <SaveModal onClose={() => setModal(null)} />}
      {modal === 'exports' && (
        <ExportsModal onClose={() => setModal(null)} onSaveProject={() => setModal('save')} onExportReel={() => setModal('reel')} />
      )}
      {modal === 'reel' && (
        <ExportModal
          clips={project.clips}
          chars={project.chars}
          charOf={charOf}
          sources={media.sources}
          initialWhich="all"
          onClose={() => setModal(null)}
        />
      )}
      <Toast />
    </div>
  );
}
