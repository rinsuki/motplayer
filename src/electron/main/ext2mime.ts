export function ext2mime(ext: string) {
    if (ext.startsWith("rpg") || ext.endsWith("_")) {
        return "application/octet-stream"
    }
    switch (ext) {
        case "html":
            return "text/html"
        case "js":
            return "application/javascript"
        case "css":
            return "text/css"
        case "json":
            return "application/json"
        case "wasm":
            return "application/wasm"
        case "ttc":
            return "font/collection"
        case "ttf":
            return "font/ttf"
        case "txt":
            return "text/plain"
        case "png":
            return "image/png"
        default:
            console.warn("unknown ext", ext)
            return "application/octet-stream"
    }
}