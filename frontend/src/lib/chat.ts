// =============================================================
// Chat Utilities - Pure functions for chat logic
// =============================================================

import type { DisplayBlock, AgentEvent } from '../types'
import { EventType, DisplayBlockType } from '../types'

/**
 * Generate a simple unique ID for turns
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Converts streaming events into DisplayBlocks.
 *
 * Key insight: Both "thinking" and "answer" events come as chunks
 * that need to be accumulated into single blocks.
 *
 * This is a pure function - given the same inputs, always returns
 * the same output. Makes it easy to test!
 */
export function addEventToBlocks(blocks: DisplayBlock[], event: AgentEvent): DisplayBlock[] {
  const lastBlock = blocks[blocks.length - 1]

  switch (event.type) {
    case EventType.Thinking:
      // Accumulate consecutive thinking events into one block
      if (lastBlock && lastBlock.type === DisplayBlockType.Thinking) {
        return [
          ...blocks.slice(0, -1),
          { ...lastBlock, content: lastBlock.content + event.content },
        ]
      }
      return [...blocks, { type: DisplayBlockType.Thinking, content: event.content }]

    case EventType.Answer:
      // Accumulate consecutive answer events into one block
      if (lastBlock && lastBlock.type === DisplayBlockType.AnswerBlock) {
        return [
          ...blocks.slice(0, -1),
          { ...lastBlock, content: lastBlock.content + event.content },
        ]
      }
      return [...blocks, { type: DisplayBlockType.AnswerBlock, content: event.content }]

    case EventType.ToolCall:
      return [
        ...blocks,
        {
          type: DisplayBlockType.ToolCall,
          id: event.id,
          tool_name: event.tool_name,
          tool_input: event.tool_input,
        },
      ]

    case EventType.ToolResult:
      return [
        ...blocks,
        {
          type: DisplayBlockType.ToolResult,
          id: event.id,
          tool_name: event.tool_name,
          tool_output: event.tool_output,
          success: event.success,
        },
      ]

    default:
      return blocks
  }
}
