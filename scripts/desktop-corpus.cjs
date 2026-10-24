const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { join } = require('node:path');
app.setName('Ivertim 3D');
app.setAppUserModelId('com.ivertim.3d');
app.setPath('userData', join(app.getPath('appData'), 'IVERTIM Corpus'));
const url = 'http://127.0.0.1:4317/';
const smoke = process.argv.includes('--smoke-test');
let mainWindow;
let splash;
let minimumElapsed = false;
let contentReady = false;
let splashStarted = 0;
function revealMain() {
  if (!minimumElapsed || !contentReady || !mainWindow || mainWindow.isDestroyed()) return;
  if (smoke) { console.log(`Ivertim 3D desktop ready; loader duration: ${Date.now() - splashStarted} ms`); app.quit(); return; }
  mainWindow.maximize(); mainWindow.show();
  if (splash && !splash.isDestroyed()) splash.destroy();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow?.isVisible()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
    else if (splash && !splash.isDestroyed()) splash.focus();
  });
  app.whenReady().then(() => {
    splash = new BrowserWindow({ width: 700, height: 528, frame: false, resizable: false, center: true, show: false, title: 'Ivertim 3D', backgroundColor: '#F7F6F4', webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    splash.once('ready-to-show', () => {
      splashStarted = Date.now();
      if (!smoke) splash.show();
      setTimeout(() => { minimumElapsed = true; revealMain(); }, 2000);
    });
    splash.loadFile(join(__dirname, '..', 'public', 'loader.html'));
    ipcMain.on('ivertim:ready', event => {
      if (mainWindow && event.sender === mainWindow.webContents && event.senderFrame === mainWindow.webContents.mainFrame && event.senderFrame.url === url) { contentReady = true; revealMain(); }
    });
    mainWindow = new BrowserWindow({
      width: 1440, height: 900, minWidth: 800, minHeight: 600,
      title: 'Ivertim 3D', show: false, icon: join(__dirname, '..', 'public', 'ivertim-3d.ico'),
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#2e4f6b', symbolColor: '#f3f7fc', height: 27 },
      backgroundColor: '#dce7ef',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: join(__dirname, 'desktop-preload.cjs') },
    });
    mainWindow.setMenu(null);
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, destination) => {
      if (destination !== url) event.preventDefault();
    });
    mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    mainWindow.loadURL(url).catch(error => {
      if (!smoke) dialog.showErrorBox('Ivertim 3D', 'Program se nije učitao. Pokreni Pokreni-IVERTIM-3D.cmd.');
      console.error(error.message); app.exit(1);
    });
  });
  app.on('window-all-closed', () => app.quit());
}
