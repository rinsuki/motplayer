import React, { useState, useEffect } from "react"
import { CssVarsProvider } from "@mui/joy/styles"
import { CssBaseline } from "@mui/joy"
import { Box } from "@mui/joy"
import { Sheet } from "@mui/joy"
import { Typography } from "@mui/joy"
import { CircularProgress } from "@mui/joy"
import { GameList } from "./components/GameList.js"
import { AddGameButton } from "./components/AddGameButton.js"
import type { GameEntry } from "../../shared/types/game-library.js"

export const App: React.FC = () => {
    const [games, setGames] = useState<GameEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadGames()

        // Listen for game removal events from the main process
        const handleGameRemoved = () => {
            loadGames()
        }

        // @ts-ignore - TypeScript doesn't know about these events
        window.addEventListener("game-removed", handleGameRemoved)
        return () => {
            // @ts-ignore
            window.removeEventListener("game-removed", handleGameRemoved)
        }
    }, [])

    const loadGames = async () => {
        try {
            const gameList = await window.motplayer.getGames()
            setGames(gameList)
        } catch (error) {
            console.error("Failed to load games:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddGame = async () => {
        const filePath = await window.motplayer.selectGameFile()
        if (filePath) {
            await window.motplayer.addGame(filePath)
            await loadGames()
        }
    }

    const handleLaunchGame = async (gameId: string) => {
        await window.motplayer.launchGame(gameId)
    }

    return (
        <CssVarsProvider>
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
                <Sheet
                    component="header"
                    variant="solid"
                    color="primary"
                    invertedColors
                    sx={{
                        p: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxShadow: "sm",
                    }}
                >
                    <Typography level="h2">motplayer</Typography>
                    <AddGameButton onAdd={handleAddGame} />
                </Sheet>
                
                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        overflow: "auto",
                        p: 3,
                        bgcolor: "background.body",
                    }}
                >
                    {loading ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "400px",
                            }}
                        >
                            <CircularProgress size="lg" />
                        </Box>
                    ) : (
                        <GameList games={games} onLaunch={handleLaunchGame} />
                    )}
                </Box>
            </Box>
        </CssVarsProvider>
    )
}