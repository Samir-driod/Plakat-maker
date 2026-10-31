import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpc } from './ipc.js';
import { registerPresent } from './present.js';
import { createSettingsStore } from './lib/settingsStore.js';
import { createTemplateStore } from './lib/templates.js';
import { createLogger } from './lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.PLAKAT_USER_DATA) app.setPath('userData', process.env.PLAKAT_USER_DATA);
const E2E_DIR = process.env.PLAKAT_E2E_DIR || null;
const isProjectArg = (a) => typeof a === 'string' && a.toLowerCase().endsWith('.plakat');

const logger = createLogger(path.join(app.getPath('userData'), 'logs'));
let mainWindow = null;
let rendererHealthy = true;
const startupFiles = process.argv.slice(1).filter(isProjectArg);

const state = {
  dirty: false,
  forceClose: false,
  takeStartupFiles() {
    return startupFiles.splice(0, startupFiles.length);
  },
};

process.on('uncaughtException', (err) => logger.error('main', err?.stack ?? err));
process.on('unhandledRejection', (err) => logger.error('main', err?.stack ?? err));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#14161c',
    title: 'Plakat Maker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
      additionalArguments: E2E_DIR ? ['--plakat-e2e'] : [],
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('before-input-event', (_event, input) => {
    if (!app.isPackaged && input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });

  win.on('close', (event) => {
    if (state.dirty && !state.forceClose && !E2E_DIR && rendererHealthy) {
      event.preventDefault();
      win.webContents.send('app:closeRequested');
    }
  });

  win.webContents.on('render-process-gone', async (_event, details) => {
    logger.error('renderer-gone', JSON.stringify(details));
    if (details.reason === 'clean-exit' || state.forceClose) return;
    rendererHealthy = false;
    const { response } = await dialog.showMessageBox(win, {
      type: 'error',
      title: 'Plakat Maker',
      message: 'Okno programu przestało działać.',
      detail: 'Twoja praca jest zapisywana automatycznie. Wczytać okno ponownie i odzyskać pracę?',
      buttons: ['Wczytaj ponownie', 'Zamknij program'],
      defaultId: 0,
    });
    if (response === 0) {
      rendererHealthy = true;
      win.reload();
    } else {
      state.forceClose = true;
      win.close();
    }
  });

  win.on('unresponsive', async () => {
    rendererHealthy = false;
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Plakat Maker',
      message: 'Program nie odpowiada.',
      detail: 'Możesz poczekać albo wczytać okno ponownie (praca jest zapisywana automatycznie).',
      buttons: ['Czekaj', 'Wczytaj ponownie'],
      defaultId: 0,
    });
    if (response === 1) win.webContents.forcefullyCrashRenderer();
  });
  win.on('responsive', () => {
    rendererHealthy = true;
  });

  win.on('closed', () => {
    mainWindow = null;
  });
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const file = argv.slice(1).find(isProjectArg);
    if (file) mainWindow.webContents.send('app:openFile', file);
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('pl.plakatmaker.app');
    Menu.setApplicationMenu(null);
    const settings = createSettingsStore(path.join(app.getPath('userData'), 'settings.json'));
    const templates = createTemplateStore(path.join(app.getPath('userData'), 'templates'));
    const { handle } = registerIpc({ getWindow: () => mainWindow, settings, templates, logger, e2eDir: E2E_DIR, state });
    registerPresent({
      handle,
      preloadPath: path.join(__dirname, 'preload.cjs'),
      htmlPath: path.join(__dirname, '..', 'src', 'present.html'),
    });
    mainWindow = createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
