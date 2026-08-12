const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getHistory: () => ipcRenderer.invoke('get-history'),
  searchHistory: (keyword) => ipcRenderer.invoke('search-history', keyword),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  togglePin: (id) => ipcRenderer.invoke('toggle-pin', id),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  copyToClipboard: (content, type) => ipcRenderer.invoke('copy-to-clipboard', content, type),
  onRefreshHistory: (callback) => ipcRenderer.on('refresh-history', () => callback()),
});
