const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
	decryptFileRequest: (filePath, password) =>
		ipcRenderer.send("decryptFileRequest", filePath, password),
	encryptFileRequest: (filePath, password) =>
		ipcRenderer.send("encryptFileRequest", filePath, password),
	revealInFinder: (filePath) => ipcRenderer.send("revealInFinder", filePath),
});
