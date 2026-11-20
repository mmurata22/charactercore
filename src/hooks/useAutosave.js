import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTOSAVE_INTERVAL_MS, AUTOSAVE_KEEP } from '../lib/constants';
import { getAutosave, listAutosaves, pruneAutosaves, putAutosave } from '../lib/autosaveStore';
import { uid } from '../lib/format';
import { isEmptyProject, summarizeProject } from '../lib/project';
import { clearCrash, crashedProjectId } from '../lib/session';

/**
 * Rolling snapshot history for one project:
 *  - every AUTOSAVE_INTERVAL_MS while something changed,
 *  - whenever the tab is hidden (switching away, closing),
 *  - on demand ("Save a copy now"), and just before a restore.
 * `applyRestore(json)` is called with a saved project's JSON when the user restores one.
 */
export function useAutosave(projectId, project, applyRestore) {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [crashed, setCrashed] = useState(() => crashedProjectId() === projectId);
  /** Newest autosave from before this session: the "nearest" one to offer after a crash. */
  const [previous, setPrevious] = useState(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const lastJson = useRef(null);
  const queue = useRef(Promise.resolve());
  const started = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setList(await listAutosaves(projectId));
    } catch {
      setError('Autosave isn’t available in this browser (storage is blocked).');
    }
  }, [projectId]);

  /** Queue a snapshot. reason 'Autosave' is skipped when nothing changed since the last one. */
  const saveNow = useCallback(
    (reason = 'Autosave') => {
      queue.current = queue.current.then(async () => {
        const p = projectRef.current;
        if (isEmptyProject(p)) return;
        const json = JSON.stringify(p);
        if (reason === 'Autosave' && json === lastJson.current) return;
        try {
          await putAutosave({
            id: `${Date.now()}-${uid()}`, projectId, at: Date.now(), reason,
            summary: summarizeProject(p), size: json.length, data: json,
          });
          lastJson.current = json;
          await pruneAutosaves(projectId, AUTOSAVE_KEEP);
          setError('');
          await refresh();
        } catch {
          setError('Couldn’t write an autosave. Browser storage may be full.');
        }
      });
      return queue.current;
    },
    [projectId, refresh],
  );

  const dismissCrash = useCallback(() => {
    clearCrash();
    setCrashed(false);
  }, []);

  const restore = useCallback(
    async (id) => {
      const entry = await getAutosave(id);
      if (!entry) return false;
      await saveNow('Before a restore'); // restoring is never destructive
      const ok = applyRestore(entry.data);
      if (ok) {
        lastJson.current = entry.data;
        dismissCrash();
      }
      return ok;
    },
    [applyRestore, saveNow, dismissCrash],
  );

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      (async () => {
        try {
          const l = await listAutosaves(projectId);
          setPrevious(l[0] ?? null);
          if (l[0]) lastJson.current = (await getAutosave(l[0].id))?.data ?? null;
        } catch {
          /* reported by refresh */
        }
        await refresh();
        saveNow();
      })();
    }
    const timer = setInterval(() => saveNow(), AUTOSAVE_INTERVAL_MS);
    const onVisibility = () => document.visibilityState === 'hidden' && saveNow();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [projectId, refresh, saveNow]);

  return { list, error, lastAt: list[0]?.at ?? null, crashed, previous, dismissCrash, saveNow, restore };
}
