import { useEffect, useState } from 'react';
import { VIEWS } from '../lib/constants';

const currentView = () => {
  const h = location.hash.slice(1);
  return VIEWS[h] ? h : 'reel';
};

/** Tiny hash router: returns the active view key ('reel' | 'script' | 'book'). */
export function useHashView() {
  const [view, setView] = useState(currentView);
  useEffect(() => {
    const onHash = () => setView(currentView());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  return view;
}
