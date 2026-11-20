import { useEffect, useRef } from 'react';

/** Calls `handler` when Escape is pressed, while the calling component is mounted. */
export function useEscape(handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') ref.current(e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
