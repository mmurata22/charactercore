import { useCallback, useRef, useState } from 'react';
import { isVideoFile } from '../lib/format';

/**
 * Video files loaded into the open project, keyed by file name.
 *   sources: name → object URL (for <video>)
 *   files:   name → File (so footage can be written into the project file)
 * Clips relink to footage by file name. The Maps are mutable so callers can read them
 * right after adding; `version` changes whenever they do.
 */
export function useSources() {
  const urls = useRef(new Map());
  const files = useRef(new Map());
  const [version, setVersion] = useState(0);

  /** Returns the names of the added files, or null if none looked like video. */
  const addFiles = useCallback((list) => {
    const added = [...list].filter(isVideoFile);
    if (!added.length) return null;
    for (const f of added) {
      if (urls.current.has(f.name)) URL.revokeObjectURL(urls.current.get(f.name));
      urls.current.set(f.name, URL.createObjectURL(f));
      files.current.set(f.name, f);
    }
    setVersion((v) => v + 1);
    return added.map((f) => f.name);
  }, []);

  /** Free every object URL (when the project closes). */
  const releaseAll = useCallback(() => {
    for (const u of urls.current.values()) URL.revokeObjectURL(u);
    urls.current.clear();
    files.current.clear();
  }, []);

  return { sources: urls.current, files: files.current, addFiles, releaseAll, version };
}
