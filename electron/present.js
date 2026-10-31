import { BrowserWindow, screen } from 'electron';

export function registerPresent({ handle, preloadPath, htmlPath }) {
  let win = null;

  handle('present:open', async ({ dataUrl, displayId }) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) throw new Error('Nieprawidłowy obraz pokazu.');
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay();
    if (win && !win.isDestroyed()) win.close();
    win = new BrowserWindow({
      ...display.bounds,
      fullscreen: true,
      frame: false,
      show: false,
      backgroundColor: '#000000',
      title: 'Pokaz — Plakat Maker',
      webPreferences: { preload: preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.on('closed', () => {
      win = null;
    });
    await win.loadFile(htmlPath);
    win.webContents.send('present:image', dataUrl);
    win.show();
    win.focus();
  });
}
