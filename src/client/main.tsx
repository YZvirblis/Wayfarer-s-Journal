import './styles/fonts.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CapturePage } from './components/CapturePage';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element.');

// The desktop hotkey opens a tiny window on /capture; everything else is the journal.
const page = window.location.pathname === '/capture' ? <CapturePage /> : <App />;

createRoot(container).render(<StrictMode>{page}</StrictMode>);
