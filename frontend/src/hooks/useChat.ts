import { useState } from 'react'
import type { Turn } from '../types'
import { DisplayBlockType } from '../types'
import { sendMessage as sendApiMessage } from '../api/client'
import { generateId, addEventToBlocks } from '../lib/chat'

export function useChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (message: string) => {
    if (message.trim() === '' || isLoading) return

    const turnId = generateId()

    const newTurn: Turn = {
      id: turnId,
      userMessage: { content: message },
      blocks: [],
      isStreaming: true,
    }

    setTurns((prev) => [...prev, newTurn])
    setIsLoading(true)

    try {
      for await (const event of sendApiMessage(message)) {
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId ? { ...turn, blocks: addEventToBlocks(turn.blocks, event) } : turn
          )
        )
      }

      setTurns((prev) =>
        prev.map((turn) => (turn.id === turnId ? { ...turn, isStreaming: false } : turn))
      )
    } catch (error) {
      console.error('Error streaming response:', error)
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                isStreaming: false,
                blocks: [
                  ...turn.blocks,
                  {
                    type: DisplayBlockType.AnswerBlock,
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  },
                ],
              }
            : turn
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return { turns, isLoading, sendMessage }
}
