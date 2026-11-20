export const APP_NAME = 'charactercore';

/** Default colours handed out to new characters, in order. */
export const PALETTE = ['#5fb7ec', '#e0677a', '#2457d6', '#1f8a4c', '#7a3fc4', '#d97706', '#0e7c86', '#c2337a'];
/** The colour picker's ready-made list (the colour wheel covers everything else). */
export const COLOR_SWATCHES = [
  ...PALETTE,
  '#dc2626', '#f97316', '#eab308', '#84cc16', '#14b8a6', '#6366f1', '#a855f7', '#78716c',
];

export const STORAGE_KEY = 'charreel.v2';
export const LEGACY_STORAGE_KEY = 'charreel.v1';
export const NAV_KEY = 'charreel.nav';

export const WIDE_QUERY = '(min-width:1100px)';

export const VIEWS = {
  reel: 'Character reel',
  script: 'Script',
  book: 'Character book',
  maps: 'Character maps',
  notes: 'Notes',
};

/** Live (synchronous) copy of the open project, and which project this tab has open. */
export const LIVE_KEY = 'charcore.live';
export const OPEN_PROJECT_KEY = 'charcore.openProject';
/** Id of the project created from the pre-projects single save. */
export const LEGACY_PROJECT_KEY = 'charcore.legacyProject';

/** Marks whether the last session closed cleanly ('open:<id>' at load ⇒ it crashed). */
export const SESSION_KEY = 'charcore.session';
export const AUTOSAVE_INTERVAL_MS = 30000;
export const AUTOSAVE_KEEP = 20;

/** Fallback used when a clip points at a character that no longer exists. */
export const UNKNOWN_CHAR = { id: '', name: '?', color: '#888', about: '' };

/** How long a text card stays up for a clip whose footage isn't added (ms). */
export const CARD_MS = 3200;
export const EXPORT_CARD_MS = 2800;
