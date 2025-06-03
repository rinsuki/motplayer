import React from "react"
import { Button } from "@mui/joy"

interface AddGameButtonProps {
    onAdd: () => void
}

export const AddGameButton: React.FC<AddGameButtonProps> = ({ onAdd }) => {
    return (
        <Button
            variant="solid"
            color="primary"
            onClick={onAdd}
            size="md"
        >
            ゲームを追加
        </Button>
    )
}