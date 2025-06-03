const { contextBridge, ipcRenderer } = require("electron");

// Expose IPC methods for launcher
contextBridge.exposeInMainWorld("motplayer", {
    getGames: () => ipcRenderer.invoke("get-games"),
    addGame: (zipPath: string) => ipcRenderer.invoke("add-game", zipPath),
    launchGame: (gameId: string) => ipcRenderer.invoke("launch-game", gameId),
    selectGameFile: () => ipcRenderer.invoke("select-game-file"),
    showGameContextMenu: (gameId: string, zipPath: string) => ipcRenderer.send("show-game-context-menu", gameId, zipPath),
    removeGame: (gameId: string) => ipcRenderer.invoke("remove-game", gameId),
});

// Forward events from main process to renderer
ipcRenderer.on("game-removed", () => {
    window.dispatchEvent(new Event("game-removed"));
});