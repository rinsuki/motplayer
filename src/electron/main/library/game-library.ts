import { app } from "electron"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { z } from "zod"

const GameEntrySchema = z.object({
    id: z.string(),
    zipPath: z.string(),
    lastPlayedAt: z.string().datetime().nullable(),
})

const GameLibrarySchema = z.object({
    version: z.literal(1),
    games: z.array(GameEntrySchema),
})

export type GameEntry = z.infer<typeof GameEntrySchema>
export type GameLibrary = z.infer<typeof GameLibrarySchema>

export class GameLibraryManager {
    private dataPath: string
    private libraryPath: string
    private library: GameLibrary | null = null

    constructor() {
        this.dataPath = path.join(app.getPath("userData"), "motplayer")
        this.libraryPath = path.join(this.dataPath, "library.json")
    }

    async init(): Promise<void> {
        await fs.mkdir(this.dataPath, { recursive: true })
        await this.load()
    }

    private async load(): Promise<void> {
        try {
            const data = await fs.readFile(this.libraryPath, "utf-8")
            this.library = GameLibrarySchema.parse(JSON.parse(data))
        } catch (error) {
            // File doesn't exist or is invalid, create new library
            this.library = {
                version: 1,
                games: [],
            }
            await this.save()
        }
    }

    private async save(): Promise<void> {
        if (!this.library) return
        await fs.writeFile(
            this.libraryPath,
            JSON.stringify(this.library, null, 2),
            "utf-8"
        )
    }

    async getGames(): Promise<GameEntry[]> {
        if (!this.library) await this.load()
        return this.library!.games.sort((a, b) => {
            // Sort by last played date (newest first), then by zip path
            if (a.lastPlayedAt && b.lastPlayedAt) {
                return b.lastPlayedAt.localeCompare(a.lastPlayedAt)
            }
            if (a.lastPlayedAt) return -1
            if (b.lastPlayedAt) return 1
            return a.zipPath.localeCompare(b.zipPath)
        })
    }

    async addGame(zipPath: string): Promise<GameEntry> {
        if (!this.library) await this.load()
        
        // Check if game already exists
        const existing = this.library!.games.find(g => g.zipPath === zipPath)
        if (existing) {
            return existing
        }

        const newGame: GameEntry = {
            id: crypto.randomUUID(),
            zipPath,
            lastPlayedAt: null,
        }

        this.library!.games.push(newGame)
        await this.save()
        return newGame
    }

    async updateLastPlayed(id: string): Promise<void> {
        if (!this.library) await this.load()
        
        const game = this.library!.games.find(g => g.id === id)
        if (game) {
            game.lastPlayedAt = new Date().toISOString()
            await this.save()
        }
    }

    async removeGame(id: string): Promise<void> {
        if (!this.library) await this.load()
        
        this.library!.games = this.library!.games.filter(g => g.id !== id)
        await this.save()
    }
}