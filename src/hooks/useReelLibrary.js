import { useCallback, useEffect, useState } from 'react';
import { deleteReel, getReel, listReels, newReelId, putReel } from '../lib/reelStore';

/** The open project's finished reels: every exported reel video, kept in browser storage. */
export function useReelLibrary(projectId) {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setList(await listReels(projectId));
    } catch {
      setError('Finished reels can’t be kept in this browser (storage is blocked).');
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Keep a finished reel. info: { name, scope, height, ext, clipCount, duration, fileName, poster } */
  const add = useCallback(
    async (blob, info) => {
      const rec = { id: newReelId(), projectId, createdAt: Date.now(), size: blob.size, mime: blob.type, ...info, blob };
      try {
        await putReel(rec);
        await refresh();
        return rec;
      } catch {
        setError('Couldn’t keep that reel: browser storage may be full. Download it instead.');
        return null;
      }
    },
    [projectId, refresh],
  );

  const rename = useCallback(
    async (id, name) => {
      const r = await getReel(id);
      if (r) await putReel({ ...r, name: name.trim() || r.name });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id) => {
      await deleteReel(id);
      await refresh();
    },
    [refresh],
  );

  return { list, error, add, rename, remove, get: getReel, refresh };
}
