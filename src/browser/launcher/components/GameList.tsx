import React from "react"
import { Box, Card, CardContent, Typography, Grid } from "@mui/joy"
import type { GameEntry } from "../../../shared/types/game-library.js"

interface GameListProps {
    games: GameEntry[]
    onLaunch: (gameId: string) => void
}

export const GameList: React.FC<GameListProps> = ({ games, onLaunch }) => {
    if (games.length === 0) {
        return (
            <Box
                sx={{
                    textAlign: "center",
                    py: 8,
                    px: 3,
                    color: "text.secondary",
                }}
            >
                <Typography level="h3" sx={{ mb: 1 }}>
                    ゲームが登録されていません
                </Typography>
                <Typography level="body-md">
                    右上の「ゲームを追加」ボタンからゲームを追加してください
                </Typography>
            </Box>
        )
    }

    return (
        <Grid container spacing={3}>
            {games.map(game => (
                <Grid key={game.id} xs={12} sm={6} md={4} lg={3}>
                    <Card
                        variant="outlined"
                        sx={{
                            cursor: "pointer",
                            transition: "all 0.2s",
                            "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: "md",
                                borderColor: "primary.outlinedBorder",
                            },
                        }}
                        onClick={() => onLaunch(game.id)}
                        onContextMenu={(e) => {
                            e.preventDefault()
                            window.motplayer.showGameContextMenu(game.id, game.zipPath)
                        }}
                    >
                        <CardContent>
                            <Typography
                                level="title-md"
                                sx={{
                                    mb: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {game.zipPath.split("/").pop() || game.zipPath}
                            </Typography>
                            <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                                {game.lastPlayedAt
                                    ? `最終プレイ: ${new Date(game.lastPlayedAt).toLocaleString("ja-JP")}`
                                    : "未プレイ"}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    )
}