from pydantic import BaseModel
from enum import StrEnum

from litellm.types.utils import Message

from .events import AgentEvent


class AgentState(BaseModel):
    messages: list[Message]


class InteractionStatus(StrEnum):
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Interaction(BaseModel):
    id: str
    status: InteractionStatus
    user_message: str
    agent_events: list[AgentEvent]
    final_agent_state: AgentState


class Chat(BaseModel):
    id: str
    interactions: list[Interaction]
