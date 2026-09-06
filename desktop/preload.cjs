const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("strategistDesktop", Object.freeze({
  chooseCaseFolder: () => ipcRenderer.invoke("vault:choose-folder"),
}));
