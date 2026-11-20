import { useEffect, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { timeAgo } from '../../lib/format';

export default function AutosaveStatus({ onOpen }) {
  const { autosave, savedFile } = useProject();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  let label = 'Autosave on';
  if (autosave.error) label = 'Autosave unavailable';
  else if (autosave.lastAt) label = `Autosaved ${timeAgo(autosave.lastAt)}`;
  return (
    <>
      <span className="autosave-status" title={savedFile ? `Last saved to ${savedFile.name}` : 'Not saved to a file yet'}>
        {label}
        {savedFile && <> · File saved {timeAgo(savedFile.at)}</>}
      </span>
      <button onClick={onOpen}>Autosaves</button>
    </>
  );
}
