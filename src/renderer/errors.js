import { toast } from '../ui/dialogs.js';

export function installErrorHandling(app) {
  let lastToast = 0;
  function report(err, origin) {
    const message = err?.stack ?? err?.message ?? String(err);
    console.error(origin, err);
    app.api.logError?.(`${origin}: ${message}`)?.catch?.(() => {});
    const now = Date.now();
    if (now - lastToast > 5000) {
      lastToast = now;
      toast('Wystąpił nieoczekiwany błąd. Praca jest zapisywana automatycznie — jeśli coś wygląda źle, użyj Ctrl+Z.', { type: 'error', timeout: 7000 });
    }
  }
  window.addEventListener('error', (e) => report(e.error ?? e.message, 'window.error'));
  window.addEventListener('unhandledrejection', (e) => report(e.reason, 'unhandledrejection'));
}
