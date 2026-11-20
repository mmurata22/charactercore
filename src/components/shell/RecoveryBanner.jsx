import { useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { formatWhen } from '../../lib/format';

/** Shown when the previous session didn't close cleanly (crash, killed tab, power loss). */
export default function RecoveryBanner({ onShowAll }) {
  const { autosave } = useProject();
  const [busy, setBusy] = useState(false);
  const prev = autosave.previous;
  if (!autosave.crashed || !prev) return null;

  return (
    <div className="recovery" role="alert">
      <span>
        <b>The app didn’t close properly last time.</b> Your latest changes were kept. If anything looks wrong,
        restore the nearest autosave from {formatWhen(prev.at)} ({prev.summary}).
      </span>
      <span className="btns">
        <button
          className="pri"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await autosave.restore(prev.id);
            setBusy(false);
          }}
        >
          Restore that autosave
        </button>
        <button onClick={onShowAll}>See all autosaves</button>
        <button onClick={autosave.dismissCrash}>Dismiss</button>
      </span>
    </div>
  );
}
