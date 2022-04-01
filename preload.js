const { ipcRenderer, contextBridge } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})

contextBridge.exposeInMainWorld('electron', {
    openDialog: (method, config) => ipcRenderer.invoke('dialog', method, config),
    pathSeparator: () => ipcRenderer.invoke('pathSeparator'),
    nanoid: () => ipcRenderer.invoke('nanoid'),
    saveJSON: (path, data) => ipcRenderer.invoke('saveJSON', path, data),
    loadJSON: (path) => ipcRenderer.invoke('loadJSON', path),
    store_get: (key) => ipcRenderer.invoke('store_get', key),
    store_set: (key, value) => ipcRenderer.invoke('store_set', key, value),
    store_delete: (key) => ipcRenderer.invoke('store_delete', key),
    quit: () => ipcRenderer.invoke('quit'),
    clearTemp: () => ipcRenderer.invoke('clearTemp'),
    saveVideoFile: (path, videoBinary) => ipcRenderer.invoke('saveVideoFile', path, videoBinary),
    verifyAssets: (assetList) => ipcRenderer.invoke('verifyAssets', assetList)
});