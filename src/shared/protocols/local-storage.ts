import { z } from "zod"

export const zLocalStorageRequest = z.object({
    mode: z.literal("load_all")
}).or(z.object({
    mode: z.literal("save"),
    key: z.string(),
    value: z.string(),
}))

export type LocalStorageRequest = z.infer<typeof zLocalStorageRequest>