// Modules to control application life and create native browser window
const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    backgroundColor: '#000000',
    center: true,
    fullscreenable: true,
    title: 'Rabbitwave Vlogger',
    fullScreenWindowTitle: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true,
      nodeIntegration: true,
      devTools: true,
      webgl: false
    },
    fullscreen: true
  });

  mainWindow.loadFile('index.html');

  //  Clear browser cache
  mainWindow.webContents.session.clearStorageData()

  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {


  //  Open any dialog
  ipcMain.handle('dialog', (event, method, params) => dialog[method](params));
  ipcMain.handle('pathSeparator', () => path.sep);
  ipcMain.handle('nanoid', () => nanoid());
  ipcMain.handle('saveJSON', (event, path, data) => saveJSON(path, data))
  ipcMain.handle('loadJSON', (event, path) => loadJSON(path))

  createWindow();

  app.on('activate', function () {

    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
});

function saveJSON(path, data) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(path, JSON.stringify(data, null, 2), { encoding: 'utf8' });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function loadJSON(path) {
  console.log(path);

  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      resolve(data);
    } catch (err) {
      reject(err);
    }
  });
}