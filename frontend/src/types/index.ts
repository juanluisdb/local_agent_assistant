// ============================================================================
// Agent Events
// ============================================================================

export const EventType = {
  Thinking: 'thinking',
  Answer: 'answer',
  ToolCall: 'tool_call',
  ToolResult: 'tool_result',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]

interface BaseEvent {
  type: EventType
}

export interface ThinkingEvent extends BaseEvent {
  type: typeof EventType.Thinking
  content: string
}

export interface AnswerEvent extends BaseEvent {
  type: typeof EventType.Answer
  content: string
}

export interface ToolCallEvent extends BaseEvent {
  type: typeof EventType.ToolCall
  id: string
  tool_name: string
  tool_input: string // Usually JSON string
}

export interface ToolResultEvent extends BaseEvent {
  type: typeof EventType.ToolResult
  id: string
  tool_name: string
  tool_output: string
  success: boolean
}

export type AgentEvent = ThinkingEvent | AnswerEvent | ToolCallEvent | ToolResultEvent

// ============================================================================
// Display Blocks
// ============================================================================

export const DisplayBlockType = {
  Thinking: 'thinking',
  AnswerBlock: 'answer_block',
  ToolCall: 'tool_call',
  ToolResult: 'tool_result',
} as const

export type DisplayBlockType = (typeof DisplayBlockType)[keyof typeof DisplayBlockType]

interface BaseDisplayBlock {
  type: DisplayBlockType
}

export interface ThinkingBlock extends BaseDisplayBlock {
  type: typeof DisplayBlockType.Thinking
  content: string
}

export interface AnswerBlock extends BaseDisplayBlock {
  type: typeof DisplayBlockType.AnswerBlock
  content: string
}

export interface ToolCallBlock extends BaseDisplayBlock {
  type: typeof DisplayBlockType.ToolCall
  id: string
  tool_name: string
  tool_input: string
}

export interface ToolResultBlock extends BaseDisplayBlock {
  type: typeof DisplayBlockType.ToolResult
  id: string
  tool_name: string
  tool_output: string
  success: boolean
}

export type DisplayBlock = ThinkingBlock | AnswerBlock | ToolCallBlock | ToolResultBlock

// ============================================================================
// Chat
// ============================================================================

export interface UserMessage {
  content: string
}

export interface Turn {
  id: string
  userMessage: UserMessage
  blocks: DisplayBlock[]
  isStreaming: boolean
}
