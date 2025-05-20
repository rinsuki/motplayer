declare global {
    interface Window {
        __REQUIRE_POLYFILL_SERIES_ONE__: {
            process: unknown,
            Buffer: unknown,
        } & ((path: string) => any);
    }
}

const p = (path: string) => {
    switch (path) {
    case "fs":
        return {
            existsSync(path: string) {
                const xhr = new XMLHttpRequest()
                xhr.open("HEAD", path, false)
                xhr.send()
                return xhr.status >= 200 && xhr.status < 400
            },
            readFileSync(path: string) {
                const xhr = new XMLHttpRequest()
                xhr.open("GET", path, false)
                xhr.send()
                if (xhr.status >= 200 && xhr.status < 400) {
                    return xhr.responseText
                } else {
                    throw new Error(`fs.readFileSync: ${path} not found`)
                }
            },
            readdirSync(path: string) {
                const url = new URL(path, location.href)
                url.searchParams.set("mode", "readdirSimple")
                const xhr = new XMLHttpRequest()
                xhr.open("GET", url, false)
                xhr.send()
                if (xhr.status >= 200 && xhr.status < 400) {
                    return JSON.parse(xhr.responseText)
                } else {
                    throw new Error(`fs.readdirSync: ${path} not found`)
                }
            }
        }
    case "path":
        return {
            ...require("path"),
            dirname(path: string) {
                return path.split("/").slice(0, -1).join("/")
            },
            join(...paths: string[]) {
                return paths.join("/")
            },
        }
    case "crypto":
        return require("crypto-browserify")
    default:
        alert(`motplayer: Require not implemented: ${path}`);
    }
}

p.process = require("process-browser")
p.Buffer = require("buffer/").Buffer

window.__REQUIRE_POLYFILL_SERIES_ONE__ = p