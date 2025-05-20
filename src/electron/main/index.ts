import { app, protocol, BrowserWindow, dialog, MessageBoxOptions, shell } from "electron"
import path from "node:path"
import { GameServer } from "./server/game/index.js"
import { fetchShared } from "./server/shared/index.js"

const zippath = process.argv[2]
const gameServers = new Map<string, GameServer>()
function registerGameServer(gameServer: GameServer) {
    const domain = gameServer.zipId + ".game.invalid"
    gameServers.set(domain, gameServer)
    return domain
}
const gameDomain = registerGameServer(await GameServer.init(zippath))

protocol.registerSchemesAsPrivileged([{
    scheme: "motplayer-game",
    privileges: {
        codeCache: true,
        standard: true,
        supportFetchAPI: true,
    }
}])

const createWindow = () => {
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(new URL(import.meta.url).pathname, "/../../preload.cjs"),
            backgroundThrottling: false,
            enableWebSQL: false,
            sandbox: true,
            safeDialogs: true,
        },
    })

    window.webContents.openDevTools({
        mode: "detach",
    })
    window.setRepresentedFilename(gameServers.get(gameDomain)!.zipPath)
    window.loadURL("motplayer-game://" + gameDomain + "/")
}

app.whenReady().then(() => {
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
    createWindow()
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