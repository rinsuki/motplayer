import { readFile } from "node:fs/promises"
import { join } from "node:path"

export async function fetchShared(request: Request) {
    const url = new URL(request.url)
    const path = url.pathname
    switch (path) {
    case "/bundle/local-storage.js":
        const r = await readFile(join(import.meta.dirname, "../../../../browser/bundle/local-storage.js"))
        return new Response(r, {
            headers: {
                "Content-Type": "application/javascript",
            }
        })
    case "/bundle/require1.js":
        const r1 = await readFile(join(import.meta.dirname, "../../../../browser/bundle/require1.js"))
        return new Response(r1, {
            headers: {
                "Content-Type": "application/javascript",
            }
        })
    }
    throw new Error("NOT_FOUND")
}