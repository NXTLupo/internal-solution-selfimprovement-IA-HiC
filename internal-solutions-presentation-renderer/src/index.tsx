// Renderer entrypoint. Mounts the App, applies brand + theme to <html>
// based on URL params or payload meta, and kicks off payload fetch.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
