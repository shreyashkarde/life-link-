import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress noisy third-party browser extension warnings (e.g. MetaMask / Web3 wallet stream muxer logs)
if (typeof window !== 'undefined') {
  const shouldSuppress = (...args: any[]): boolean => {
    try {
      const fullText = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message + ' ' + (arg.stack || '');
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      return (
        fullText.includes('MaxListenersExceededWarning') ||
        fullText.includes('ObjectMultiplex') ||
        fullText.includes('app-init-liveness') ||
        fullText.includes('background-liveness') ||
        fullText.includes('orphaned data') ||
        fullText.includes('google.maps.Marker is deprecated') ||
        fullText.includes('Google Maps JavaScript API has been loaded directly') ||
        fullText.includes('contentscript.js') ||
        fullText.includes('chrome-extension://')
      );
    } catch {
      return false;
    }
  };

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (shouldSuppress(...args)) return;
    originalWarn.apply(console, args);
  };

  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (shouldSuppress(...args)) return;
    originalError.apply(console, args);
  };

  const originalLog = console.log;
  console.log = (...args: any[]) => {
    if (shouldSuppress(...args)) return;
    originalLog.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

