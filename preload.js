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
});