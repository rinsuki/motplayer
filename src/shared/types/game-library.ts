export interface GameEntry {
    id: string
    zipPath: string
    lastPlayedAt: string | null
}

export interface MotplayerAPI {
    getGames(): Promise<GameEntry[]>
    addGame(zipPath: string): Promise<GameEntry>
    launchGame(gameId: string): Promise<void>
    selectGameFile(): Promise<string | null>
    showGameContextMenu(gameId: string, zipPath: string): void
    removeGame(gameId: string): Promise<void>
}

declare global {
    interface Window {
        motplayer: MotplayerAPI
    }
}