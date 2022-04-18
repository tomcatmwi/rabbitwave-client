// Modules to control application life and create native browser window
const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { nanoid } = require('nanoid');

const store = new Store();

console.log('Rabbitwave Streamer 1.0 (C) 2022 tomcat^mwi. All rights reserved.');
console.log('Start with -h or --help for command line options.');

//  Process command line arguments --------------------------------------------------------------------------------------------
//  The function is only here I can collapse it in VSCode...
const argv = process.argv.slice(2, process.argv.length);

(() => {
  let argvIndex;

  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(`

Available command line parameters:

-c, --config [filename]       Load the specified configuration file, and remember it as the last one
-h, --help                    Show this help
-x, --clear                   Clear local storage (forget last saved config / asset list, etc.)
  `);
    process.exit();
  }

  //  Clear local storage --------------------------------------------------------------------------------------
  if (argv.includes('-x') || argv.includes('--clear')) {
    console.log('Stored values cleared!');
    store.clear();
  }

  //  Get config file --------------------------------------------------------------------------------------
  if (argv.includes('-c') || argv.includes('--config')) {
    argvIndex = argv.findIndex(x => x === '-c' || x === '--config') + 1;
    if (argvIndex < argv.length - 1) {
      console.err('No configuration file was specified.');
      process.exit();
    }

    store.add('lastConfig', argv[index]);
    console.log(`Attempting to load configuration file: "${argv[index]}"`);

    //  Load config file --------------------------------------------------------------------------------------
    if (!fs.existsSync(argv[index])) {
      console.err(`Configuration file "${argv[index]}" doesn't exist. If the savePath contains spaces, please specify it between quotes.`);
      process.exit();
    }
  }

})();

//  ---------------------------------------------------------------------------------------------------

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    backgroundColor: '#000000',
    center: true,
    fullscreenable: true,
    title: 'Rabbitwave Vlogger',
    fullScreenWindowTitle: true,
    autoHideMenuBar: true,
    nodeIntegrationInWorker: true,
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

  mainWindow.on('close', function (e) {
    var choice = dialog.showMessageBox(this,
      {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Are you sure you want to quit?'
      });
    if (choice == 1)
      e.preventDefault();
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {

  //  Exposing methods to templates
  ipcMain.handle('dialog', (event, method, params) => dialog[method](params));
  ipcMain.handle('pathSeparator', () => path.sep);
  ipcMain.handle('nanoid', () => nanoid());
  ipcMain.handle('saveJSON', (event, savePath, data) => saveJSON(savePath, data));
  ipcMain.handle('loadJSON', (event, savePath) => loadJSON(savePath));
  ipcMain.handle('store_get', (event, key) => store.get(key));
  ipcMain.handle('store_set', (event, key, value) => store.set(key, value));
  ipcMain.handle('store_delete', (event, key) => store.delete(key));
  ipcMain.handle('quit', () => process.exit());
  ipcMain.handle('saveVideoFile', (event, savePath, videoBinary) => saveVideoFile(savePath, videoBinary));
  ipcMain.handle('verifyAssets', (event, files) => verifyAssets(files));

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

//  Saves a JSON file
function saveJSON(savePath, data) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(savePath, JSON.stringify(data, null, 2), { encoding: 'utf8' });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

//  Loads a JSON file
function loadJSON(savePath) {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(fs.readFileSync(savePath, { encoding: 'utf8' }));
      resolve(data);
    } catch (err) {
      reject(err);
    }
  });
}

//  Saves a video file
function saveVideoFile(savePath, videoBinary) {
  return new Promise((resolve, reject) => {
    fs.writeFile(savePath, Buffer.from(videoBinary, 'base64'), error => !!error ? reject(error) : resolve(savePath));
  });
}

//  Verifies if all file assets exist
function verifyAssets(assetList) {
  const missingAssets = [];
  assetList.filter(x => ['video', 'audio', 'image'].includes(x.type)).forEach(asset => {
    if (!fs.existsSync(asset.filename))
      missingAssets.push(asset);
  });
  return missingAssets;
}
