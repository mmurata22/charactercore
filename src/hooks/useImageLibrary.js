import { useCallback, useEffect, useRef, useState } from 'react';
import { addImage, deleteImage, getImage } from '../lib/imageStore';

/**
 * The open project's moodboard images. `url(imageId)` returns an object URL once the image
 * has loaded from storage (null until then; the component re-renders when it arrives).
 */
export function useImageLibrary(projectId) {
  const urls = useRef(new Map()); // imageId → url | 'loading' | 'missing'
  const [, setVersion] = useState(0);
  const [error, setError] = useState('');
  const bump = () => setVersion((v) => v + 1);

  useEffect(
    () => () => {
      for (const u of urls.current.values()) if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      urls.current.clear();
    },
    [projectId],
  );

  const url = useCallback(
    (imageId) => {
      const u = urls.current.get(imageId);
      if (u) return u.startsWith('blob:') ? u : null;
      urls.current.set(imageId, 'loading');
      getImage(projectId, imageId)
        .then((rec) => {
          urls.current.set(imageId, rec ? URL.createObjectURL(rec.blob) : 'missing');
          bump();
        })
        .catch(() => urls.current.set(imageId, 'missing'));
      return null;
    },
    [projectId],
  );

  /** Store image files; returns their new image ids (non-images are skipped). */
  const add = useCallback(
    async (files) => {
      const ids = [];
      for (const f of [...files].filter((x) => x.type.startsWith('image/'))) {
        try {
          const imageId = await addImage(projectId, f);
          urls.current.set(imageId, URL.createObjectURL(f));
          ids.push(imageId);
        } catch {
          setError('Couldn’t store that image. Browser storage may be full.');
        }
      }
      if (ids.length) bump();
      return ids;
    },
    [projectId],
  );

  const remove = useCallback(
    async (imageId) => {
      const u = urls.current.get(imageId);
      if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
      urls.current.delete(imageId);
      await deleteImage(projectId, imageId).catch(() => {});
    },
    [projectId],
  );

  const get = useCallback((imageId) => getImage(projectId, imageId), [projectId]);

  return { url, add, remove, get, error };
}
