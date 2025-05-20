import { open } from "fs/promises"
import { FileHandleBlobProvider } from "../../file-handle-blob-provider.js"
import { ZipFileEntry, ZipReader } from "async-zip-reader"
import { join as joinposix } from "node:path/posix"
import { ext2mime } from "../../ext2mime.js"
import { z } from "zod"
import { zLocalStorageRequest } from "../../../../shared/protocols/local-storage.js"
import { readFile, writeFile } from "node:fs/promises"
import { escapeHTML } from "./html-escape.js"
import { DatabaseSync } from "node:sqlite"
import { createHash } from "node:crypto"

const zCompatibilityOptions = z.object({
    disableVorbisDecoder: z.boolean().default(true).describe([
        "vorbisdecoder.js を無効化",
        "理由: vorbisdecoder.js は Web Worker を必要としますが、Electron + カスタムURIスキーマ + CSP sandbox の組み合わせでは Web Worker が動作しないため。",
        "Electron は Vorbis を標準でデコードできるため、vorbisdecoder.js はそもそも不要なはずです。",
        "ほとんどの RPGツクールMZ の作品でこの設定が必要です。"
    ].join("\n")),
    enableLocalStorageImpl: z.boolean().default(true).describe([
        "motplayer による localStorage の実装を挿入",
        "理由: localStorage を motplayer の管理下に置くことで、motplayer によりセーブデータが管理できるようになります。",
        "意図せず管理されていないストレージを使うことを防ぐことを目的として、CSP sandbox を使用してストレージ類のAPIを無効化しているため、これがないとストレージが一切存在しなくなります。",
    ].join("\n")),
})

const CSP_RULE = "default-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob: motplayer-game://shared; sandbox allow-scripts allow-popups"

export class GameServer {
    public readonly zipId: string
    #filesMap = new Map<string, ZipFileEntry>()
    #dirMap = new Map<string, {name: string, isDirectory: boolean}[]>()
    #compatibilityOptions: z.infer<typeof zCompatibilityOptions>
    #database

    private constructor(public readonly zipPath: string, private reader: ZipReader, compatibilityOptions: z.infer<typeof zCompatibilityOptions>, savePath: string) {
        this.zipId = createHash("sha256").update(reader.files.map(f => [f.fileName, f.uncompressedSize, f.crc32].join(",")).join(",")).digest("hex")
        console.log(reader.directories.keys())
        this.#filesMap = new Map(reader.files.map(f => {
            const path = "/" + joinposix(f.dirName, f.fileName).split("/").map(x => encodeURI(x)).join("/").toLowerCase()
            return [path, f]
        }))
        this.#dirMap = new Map(reader.directories.entries().map(([k, v]) => {
            let dirpath = "/" + (k.split("/").map(x => encodeURI(x)).join("/")).toLowerCase()

            return [dirpath, Array.from(v.values().map(x => {
                let fileName, isDirectory = false
                if ("fileName" in x) {
                    fileName = x.fileName
                    isDirectory = x.fileName.endsWith("/")
                } else {
                    fileName = x.directory
                    isDirectory = true
                }
                if (fileName.endsWith("/")) {
                    fileName = fileName.slice(0, -1)
                }
                return { name: fileName, isDirectory }
            }))]
        }))
        this.#compatibilityOptions = compatibilityOptions
        try {
            this.#database = new DatabaseSync(zipPath + ".motplayer_save")
        } catch(e) {
            console.warn("Failed to create save db file on zipPath", e)
            this.#database = new DatabaseSync(savePath + ".motplayer_save")
        }
        this.#database.exec(`CREATE TABLE IF NOT EXISTS local_storage (key TEXT PRIMARY KEY, value TEXT, created_at INTEGER, updated_at INTEGER) STRICT`)
    }

    static async init(zipPath: string, compatibilityOptions: unknown | z.infer<typeof zCompatibilityOptions> = {}) {
        const fp = await open(zipPath, "r")
        const provider = await FileHandleBlobProvider.create(fp)
        const reader = await ZipReader.init(provider, "Shift_JIS")
        return new GameServer(zipPath, reader, zCompatibilityOptions.parse(compatibilityOptions), zipPath.split("/").slice(-1)[0].split(".")[0])
    }

    async fetch(request: Request) {
        const url = new URL(request.url)
        
        if (url.pathname === "/api/localstorage") {
            return this.fetchLocalStorageAPI(request)
        }

        let dirpath = url.pathname.toLowerCase()
        if (!dirpath.endsWith("/")) {
            dirpath = dirpath + "/"
        }
        const dir = this.#dirMap.get(dirpath.toLowerCase())
        if (dir != null) {
            let html = "<!DOCTYPE html><html><head><meta charset=UTF-8></head><body><h1>Index of " + escapeHTML(decodeURI(url.pathname)) + "</h1>"
            if (dir.some(x => x.name === "package.json")) {
                const packageJsonChecker = "(" + (() => {
                    const xhr = new XMLHttpRequest()
                    xhr.open("GET", "package.json", false)
                    xhr.send()
                    const json = JSON.parse(xhr.responseText)
                    if (json.main && json.main.endsWith(".html") && json.window && json.window.width && json.window.height) {
                        // #region RPGツクールMV用の処理
                        const systemJsonUrl = new URL("./data/System.json", new URL(json.main, location.href))
                        try {
                            const systemJsonXhr = new XMLHttpRequest()
                            systemJsonXhr.open("GET", systemJsonUrl.href, false)
                            systemJsonXhr.send()
                            const systemJson = JSON.parse(systemJsonXhr.responseText)
                            if (systemJson && typeof systemJson.gameTitle === "string") {
                                json.window.title = systemJson.gameTitle
                            }
                        } catch(e) {
                            console.error("Failed to load System.json", e)
                        }
                        // #endregion
                        const button = document.createElement("button")
                        if (json.window.title) {
                            button.innerText = json.window.title
                        } else {
                            button.innerText = "このフォルダのアプリ"
                        }
                        button.innerText += "を起動"
                        button.addEventListener("click", () => {
                            resizeTo(
                                json.window.width + (window.outerWidth - window.innerWidth),
                                json.window.height + (window.outerHeight - window.innerHeight)
                            )
                            setTimeout(() => {
                                location.href = json.main
                            }, 100)
                        })
                        document.currentScript?.parentElement?.appendChild(button)
                    }
                }).toString() + ")()"
                html += "<div><script>" + packageJsonChecker + "</script></div>"
            }
            html += "<ul>"
            if (dirpath !== "/") {
                html += "<li><a href=..>..</a></li>"
            }
            for (const file of dir) {
                html += "<li>"
                html += file.isDirectory ? "📁 " : "📄 "
                html += "<a"
                if (file.isDirectory || file.name.toLowerCase().endsWith(".html")) {
                    html += " href=\"" + encodeURI(file.name) + (file.isDirectory ? "/" : "") + "\""
                } else if (file.name.toLowerCase().endsWith(".txt")) {
                    html += " href=\"" + encodeURI(file.name) + "?mode=textviewer\""
                }
                html += ">"
                html += escapeHTML(file.name)
                html += "</a>"
            }
            html += "</ul><hr><address>motplayer index</address></body></html>"
            return new Response(html, {
                headers: {
                    "Content-Security-Policy": CSP_RULE,
                    "Content-Type": "text/html; charset=UTF-8",
                }
            })
        }

        const file = this.#filesMap.get(url.pathname.toLowerCase())
        if (file == null) {
            throw new Error("FILE_NOT_FOUND")
        }

        if (url.searchParams.get("mode") === "textviewer") {
            const res = await readFile(new URL("../../../../../static/textviewer.html", import.meta.url).pathname)
            return new Response(res, {
                headers: {
                    "Content-Security-Policy": CSP_RULE,
                    "Content-Type": "text/html; charset=UTF-8",
                }
            })
        }

        if (this.#compatibilityOptions.disableVorbisDecoder && file.fileName.endsWith("vorbisdecoder.js")) {
            return new Response("(" + (() => {
                const audio = document.createElement("audio")
                if (!audio.canPlayType("audio/ogg; codecs=vorbis")) {
                    alert("motplayer: この Electron ビルドは Vorbis をサポートしていません。音声が正しく再生されない可能性があります。")
                }
            }).toString() + ")()", {
                headers: {
                    "Content-Type": "application/javascript",
                }
            })
        }
        
        let content = await this.reader.extract(file)
        const contentType = ext2mime(file.fileName.split(".").at(-1) ?? "")
        if (contentType === "text/html") {
            let text = new TextDecoder().decode(await content.arrayBuffer())
            const originalText = text
            if (this.#compatibilityOptions.enableLocalStorageImpl) {
                text = text.replace("<script", "<!-- motplayer inject: enableLocalStorageImpl --><script src=motplayer-game://shared/bundle/local-storage.js data-api=/api/localstorage></script><script")
            }
            if (originalText !== text) {
                content = new File([text], content.name, { type: content.type })
            }
        }
        return new Response(content, {
            headers: {
                "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": contentType,
                // polyfill外でのストレージ類への書き込みを抑制するために CSP sandbox を使用
                "Content-Security-Policy": CSP_RULE,
            }
        })
    }

    private async fetchLocalStorageAPI(request: Request) {
        const json = await request.json()
        const req = zLocalStorageRequest.parse(json)
        let res = undefined
        switch (req.mode) {
        case "load_all":
            res = this.#database.prepare("SELECT key, value FROM local_storage ORDER BY created_at ASC").all()
            break
        case "save":
            this.#database.prepare("INSERT INTO local_storage (key, value, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(req.key, req.value, Date.now(), Date.now())
            res = { result: "ok" }
            break
        }
        if (res == null) {
            throw new Error("Invalid request")
        }
        return new Response(JSON.stringify(res), {
            headers: {
                "Content-Type": "application/json",
            }
        })
    }
}