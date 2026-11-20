import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/shell.css';
import './styles/reel.css';
import './styles/modals.css';
import './styles/script.css';
import './styles/book.css';
import './styles/home.css';
import './styles/maps.css';
import './styles/notes.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
