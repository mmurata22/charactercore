import { useEffect, useState } from 'react';
import { OPEN_PROJECT_KEY } from './lib/constants';
import { loadProjectRecord } from './lib/projectStore';
import { ProjectProvider } from './state/ProjectContext.jsx';
import Home from './components/home/Home.jsx';
import Workspace from './components/Workspace.jsx';

/** Which project this tab has open survives a reload, but a new visit starts at the home screen. */
const readOpen = () => {
  try {
    return sessionStorage.getItem(OPEN_PROJECT_KEY);
  } catch {
    return null;
  }
};
const writeOpen = (id) => {
  try {
    if (id) sessionStorage.setItem(OPEN_PROJECT_KEY, id);
    else sessionStorage.removeItem(OPEN_PROJECT_KEY);
  } catch {
    /* ignore */
  }
};

/** You can't get into the app without choosing a project on the home screen. */
export default function App() {
  const [session, setSession] = useState(null); // { record, media }
  const [booting, setBooting] = useState(() => !!readOpen());
  const [error, setError] = useState('');

  async function openProject(id, media = []) {
    setError('');
    try {
      const record = await loadProjectRecord(id);
      if (record) {
        writeOpen(id);
        setSession({ record, media });
      } else writeOpen(null);
    } catch {
      setError('That project couldn’t be opened from browser storage.');
    }
    setBooting(false);
  }

  useEffect(() => {
    const id = readOpen();
    if (id) openProject(id);
  }, []);

  function exitToHome() {
    writeOpen(null);
    setSession(null);
    history.replaceState(null, '', location.pathname);
  }

  if (booting) return <div className="boot">Opening project…</div>;
  if (!session) return <Home onOpen={openProject} openError={error} />;
  return (
    <ProjectProvider key={session.record.id} record={session.record} initialMedia={session.media} onExit={exitToHome}>
      <Workspace />
    </ProjectProvider>
  );
}
