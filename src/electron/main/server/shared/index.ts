import { readFile } from "fs/promises"

export async function fetchShared(request: Request) {
    const url = new URL(request.url)
    const path = url.pathname
    switch (path) {
    case "/bundle/local-storage.js":
        const r = await readFile(new URL("../../../../browser/bundle/local-storage.js", import.meta.url).pathname)
        return new Response(r, {
            headers: {
                "Content-Type": "application/javascript",
            }
        })
    }
    throw new Error("NOT_FOUND")
}