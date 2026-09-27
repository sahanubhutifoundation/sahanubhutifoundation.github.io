import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { syncBrowserIdentity } from './utils/browserIdentity';

// Immediately synchronize browser identity with canonical Foundation config
syncBrowserIdentity();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
