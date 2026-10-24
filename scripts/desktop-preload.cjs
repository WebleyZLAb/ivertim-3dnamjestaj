const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ivertimDesktop', Object.freeze({ ready: () => ipcRenderer.send('ivertim:ready') }));
