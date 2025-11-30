from pydantic import BaseModel
from enum import StrEnum


class EventType(StrEnum):
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    THINKING = "thinking"
    ANSWER = "answer"


class ToolCallEvent(BaseModel):
    type: EventType = EventType.TOOL_CALL
    id: str
    tool_name: str
    tool_input: str


class ToolResultEvent(BaseModel):
    type: EventType = EventType.TOOL_RESULT
    id: str
    tool_name: str
    tool_output: str
    success: bool


class ThinkingEvent(BaseModel):
    type: EventType = EventType.THINKING
    content: str


class AnswerEvent(BaseModel):
    type: EventType = EventType.ANSWER
    content: str


AgentEvent = ToolCallEvent | ToolResultEvent | ThinkingEvent | AnswerEvent
