import { app, protocol, BrowserWindow, dialog, MessageBoxOptions, shell, ipcMain, Menu } from "electron"
import path from "node:path"
import { GameServer } from "./server/game/index.js"
import { fetchShared } from "./server/shared/index.js"
import { GameLibraryManager } from "./library/game-library.js"

const gameServers = new Map<string, GameServer>()
const gameLibrary = new GameLibraryManager()

function registerGameServer(gameServer: GameServer) {
    const domain = gameServer.zipId + ".game.invalid"
    gameServers.set(domain, gameServer)
    return domain
}

protocol.registerSchemesAsPrivileged([{
    scheme: "motplayer-game",
    privileges: {
        codeCache: true,
        standard: true,
        supportFetchAPI: true,
        stream: true,
    }
}])

const createLauncherWindow = () => {
    const window = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(import.meta.dirname, "../preload-launcher.cjs"),
            sandbox: false,
            safeDialogs: true,
        },
    })

    window.setAutoHideMenuBar(true)
    window.loadFile(path.join(import.meta.dirname, "../../../static/launcher.html"))
    return window
}

const createGameWindow = async (zipPath: string) => {
    const gameServer = await GameServer.init(zipPath)
    const gameDomain = registerGameServer(gameServer)
    
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(import.meta.dirname, "../preload-game.cjs"),
            backgroundThrottling: false,
            enableWebSQL: false,
            sandbox: true,
            safeDialogs: true,
        },
    })

    window.setAutoHideMenuBar(true)
    window.webContents.openDevTools({
        mode: "detach",
    })
    gameServer.browserWindow = window
    window.setRepresentedFilename(gameServer.zipPath)
    window.loadURL("motplayer-game://" + gameDomain + "/")
    
    return window
}

// IPC handlers
ipcMain.handle("get-games", async () => {
    return await gameLibrary.getGames()
})

ipcMain.handle("add-game", async (event, zipPath: string) => {
    return await gameLibrary.addGame(zipPath)
})

ipcMain.handle("launch-game", async (event, gameId: string) => {
    const games = await gameLibrary.getGames()
    const game = games.find(g => g.id === gameId)
    if (!game) {
        throw new Error("Game not found")
    }
    
    await gameLibrary.updateLastPlayed(gameId)
    await createGameWindow(game.zipPath)
})

ipcMain.handle("select-game-file", async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
        properties: ["openFile"],
        filters: [
            { name: "Game Files", extensions: ["zip"] },
            { name: "All Files", extensions: ["*"] }
        ]
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
    }
    return null
})

ipcMain.handle("remove-game", async (event, gameId: string) => {
    await gameLibrary.removeGame(gameId)
    // Notify the launcher window to refresh
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
        window.webContents.send("game-removed")
    }
})

ipcMain.on("show-game-context-menu", (event, gameId: string, zipPath: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    const template = [
        {
            label: process.platform === "win32" ? "Explorerで表示" : process.platform === "darwin" ? "Finderで表示" : "ファイルマネージャーで表示",
            click: () => {
                shell.showItemInFolder(zipPath)
            }
        },
        {
            type: "separator" as const
        },
        {
            label: "ライブラリから削除",
            click: async () => {
                const result = await dialog.showMessageBox(window, {
                    type: "question",
                    message: "ライブラリから削除",
                    detail: "このゲームをライブラリから削除しますか？\n（ZIPファイル自体は削除されません）",
                    buttons: ["削除", "キャンセル"],
                    defaultId: 0,
                    cancelId: 1,
                })
                
                if (result.response === 0) {
                    await gameLibrary.removeGame(gameId)
                    window.webContents.send("game-removed")
                }
            }
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window })
})

app.whenReady().then(async () => {
    await gameLibrary.init()
    
    protocol.handle("motplayer-game", async request => {
        const url = new URL(request.url)
        if (url.host === "shared") {
            return fetchShared(request)
        }
        if (url.host.endsWith(".game.invalid")) {
            return gameServers.get(url.host)!.fetch(request)
        }
        throw new Error("Invalid URL: " + request.url)
    })
    
    // If zip path is provided as argument, launch game directly
    const zipPath = process.argv[2]
    if (zipPath) {
        await createGameWindow(zipPath)
        const games = await gameLibrary.getGames()
        const game = games.find(g => g.zipPath === zipPath)
        if (game) {
            await gameLibrary.updateLastPlayed(game.id)
        }
    } else {
        // Otherwise, show launcher
        createLauncherWindow()
    }
})

app.on("window-all-closed", () => {
    app.quit()
})

app.on("web-contents-created", (event, contents) => {
    const externalLinkHandler = (url: string) => {
        const parsed = new URL(url)
        const options: MessageBoxOptions = {
            type: "question",
            message: "外部リンク",
            detail: "以下の外部リンクを開きますか？\n\n" + parsed.href,
            buttons: ["開く", "キャンセル"],
            defaultId: 0,
            cancelId: 1,
        }

        const window = BrowserWindow.fromWebContents(contents)
        let promise
        if (window == null) {
            promise = dialog.showMessageBox(options)
        } else {
            promise = dialog.showMessageBox(window, options)
        }
        promise.then(result => {
            if (result.response === 0) {
                shell.openExternal(url)
            }
        })
    }
    contents.on("will-navigate", (event, url) => {
        const parsed = new URL(url)
        if (parsed.protocol !== "motplayer-game:") {
            event.preventDefault()
            externalLinkHandler(url)
        }
    })
    contents.setWindowOpenHandler(({url}) => {
        externalLinkHandler(url)
        return { action: "deny" }
    })
})