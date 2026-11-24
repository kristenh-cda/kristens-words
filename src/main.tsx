import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// The offline cache breaks sandboxed previews (it intercepts the preview's own
// requests), so only register it in real production builds and clear any
// previously-installed copy otherwise.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch((error) => {
        console.warn('Could not request persistent offline storage.', error);
      });
    }

    if (import.meta.env.PROD) {
      let hadController = Boolean(navigator.serviceWorker.controller);
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !reloading) {
          reloading = true;
          window.location.reload();
        }
        hadController = true;
      });

      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
        const checkForUpdates = () => {
          if (navigator.onLine && document.visibilityState === 'visible') {
            registration.update().catch((error) => console.warn('Could not check for app updates.', error));
          }
        };
        checkForUpdates();
        window.setInterval(checkForUpdates, 60_000);
        window.addEventListener('online', checkForUpdates);
        document.addEventListener('visibilitychange', checkForUpdates);
      }).catch((error) => {
        console.warn('Service worker registration failed; app remains available online.', error);
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  });
}
