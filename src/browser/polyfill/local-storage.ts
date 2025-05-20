import { type LocalStorageRequest } from "../../shared/protocols/local-storage.js";

(() => {
    const apiPath = document.currentScript?.getAttribute("data-api");
    if (apiPath == null) {
        alert("ERROR: motplayer: localStorage polyfill: data-api attribute is required");
        throw new Error("ERROR: motplayer: localStorage polyfill: data-api attribute is required");
    }

    class PolyfillStorage {
        #keys: string[] = []
        setItem(key: string, value: any) {
            if (!this.#keys.includes(key)) {
                this.#keys.push(key)
            }
            // @ts-expect-error
            this[key] = value
        }
        key(i: number) {
            console.log(this.#keys[i])
            return this.#keys[i] ?? null
        }
        getItem(key: string) {
            // @ts-expect-error
            if (!(key in this)) this[key] = null
            // @ts-expect-error
            return this[key]
        }
        removeItem(key: string) {
            // @ts-expect-error
            delete this[key]
            this.#keys = this.#keys.filter(x => x !== key)
        }
        get length() {
            return this.#keys.length
        }
    }

    function send(endpoint: string, data: LocalStorageRequest) {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", endpoint, false)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify(data))
        if (xhr.status !== 200) {
            throw new Error("Failed to send data to server: " + xhr.statusText)
        }
        return JSON.parse(xhr.responseText)
    }

    class PolyfillServerBackendStorage extends PolyfillStorage {
        #disableSync = true
        #apiEndpoint: string

        constructor(apiEndpoint: string) {
            super()
            this.#apiEndpoint = apiEndpoint
            const res = send(this.#apiEndpoint, {mode: "load_all"})
            this.#disableSync = true
            for (const item of res) {
                try {
                    const value = (!item.value.startsWith("base64:")) ? item.value : new TextDecoder("UTF-8").decode(Uint8Array.from(Array.prototype.map.call(atob(item.value.slice("base64:".length)), x => x.charCodeAt(0))))
                    // console.info(item.key, value)
                    this.setItem(item.key, value)
                } catch(e) {
                    console.error(e)
                }
            }
            this.#disableSync = false
            this.setItem = this.setItem.bind(this)
            this.getItem = this.getItem.bind(this)
            this.removeItem = this.removeItem.bind(this)
        }

        setItem(key: string, value: any) {
            super.setItem(key, value)
            if (!this.#disableSync) {
                const u8 = new TextEncoder().encode(`${value}`)
                const chars = Array.from(u8).map(c => String.fromCharCode(c)).join("")
                const xhr = new XMLHttpRequest()
                send(this.#apiEndpoint, {
                    mode: "save",
                    key,
                    value: "base64:" + btoa(chars),
                })
            }
        }
    }

    Object.defineProperty(window, "localStorage", {value: new PolyfillServerBackendStorage(apiPath)})
})()