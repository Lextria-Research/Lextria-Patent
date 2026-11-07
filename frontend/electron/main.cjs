const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'Lextria Patent Operations System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    show: false // Graceful reveal on ready-to-show
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && !process.env.ELECTRON_USE_DIST) {
    mainWindow.loadURL(devUrl).catch(() => {
      // Fallback if dev server is not ready, load dist
      const indexPath = path.join(__dirname, '../dist/index.html');
      mainWindow.loadFile(indexPath);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default browser instead of electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
