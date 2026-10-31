const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel, fn) => {
  const listener = (_event, ...args) => fn(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  isE2E: process.argv.includes('--plakat-e2e'),
  getSettings: () => invoke('settings:get'),
  setSettings: (patch) => invoke('settings:set', patch),
  openProjectDialog: () => invoke('project:open'),
  readProject: (filePath) => invoke('project:read', filePath),
  saveProject: (opts) => invoke('project:save', opts),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || null;
    } catch {
      return null;
    }
  },
  saveExport: (opts) => invoke('export:save', opts),
  saveExportMany: (opts) => invoke('export:saveMany', opts),
  showItemInFolder: (p) => invoke('shell:showItem', p),
  copyImage: (dataUrl) => invoke('clipboard:writeImage', dataUrl),
  autosaveWrite: (text) => invoke('autosave:write', text),
  autosaveRead: () => invoke('autosave:read'),
  autosaveClear: () => invoke('autosave:clear'),
  listTemplates: () => invoke('templates:list'),
  readTemplate: (id) => invoke('templates:read', id),
  saveTemplate: (t) => invoke('templates:save', t),
  deleteTemplate: (id) => invoke('templates:delete', id),
  listRecent: () => invoke('recent:list'),
  removeRecent: (p) => invoke('recent:remove', p),
  setTitle: (title) => invoke('app:setTitle', title),
  setDirty: (dirty) => invoke('app:setDirty', dirty),
  confirmClose: () => invoke('app:confirmClose'),
  startupFiles: () => invoke('app:startupFiles'),
  logError: (message) => invoke('log:error', message),
  listDisplays: () => invoke('displays:list'),
  present: (opts) => invoke('present:open', opts),
  onOpenFile: (fn) => on('app:openFile', fn),
  onCloseRequested: (fn) => on('app:closeRequested', fn),
  onPresentImage: (fn) => on('present:image', fn),
});
