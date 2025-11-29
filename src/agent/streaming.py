from dataclasses import dataclass, field
from typing import List, Tuple

from litellm.types.utils import Message, Delta
from pydantic import BaseModel

from src.models.events import ThinkingEvent, AnswerEvent


@dataclass
class ToolCallAccumulator:
    """Internal accumulator for a single tool call during streaming."""

    id: str | None = None
    name: str | None = None
    arg_buf: str = field(default_factory=str)


class ToolCall(BaseModel):
    """A complete tool call with all arguments assembled."""

    id: str
    name: str
    raw_args: str


class StreamAccumulator:
    """Accumulates streaming deltas and produces events.

    Responsibilities:
    - accumulate reasoning_content and content in buffers
    - accumulate fragmented tool calls per `index`
    - expose immediate events (ThinkingEvent/AnswerEvent) for UI
    - finalize into a Message and tool-calls list when stream finishes
    """

    def __init__(self) -> None:
        self.reasoning: str = ""
        self.content: str = ""
        # tool_calls by index -> internal accumulator
        self.tool_calls: dict[int, ToolCallAccumulator] = {}

    def accumulate(self, delta: Delta) -> List[ThinkingEvent | AnswerEvent]:
        """Accumulate a single delta and return immediate events to emit.

        Returns a list of events (ThinkingEvent/AnswerEvent).
        """
        events: List[ThinkingEvent | AnswerEvent] = []

        if delta.reasoning_content:
            self.reasoning += delta.reasoning_content
            events.append(ThinkingEvent(content=delta.reasoning_content))

        if delta.content:
            self.content += delta.content
            events.append(AnswerEvent(content=delta.content))

        if delta.tool_calls:
            # tool_calls is a list of partial tool call objects
            for t in delta.tool_calls:
                idx = t.index
                bucket = self.tool_calls.setdefault(idx, ToolCallAccumulator())
                if t.function.name:
                    bucket.name = t.function.name
                # arguments may be partial fragments; concatenate
                if t.function.arguments:
                    bucket.arg_buf += t.function.arguments
                # id may appear in the tool call delta
                if t.id:
                    bucket.id = t.id

        return events

    def finalize(self) -> Tuple[Message, List[ToolCall]]:
        """Return a final Message representing the assistant reply and an ordered
        list of tool calls with all arguments assembled.
        """
        final_message = Message(
            role="assistant", content=self.content, reasoning_content=self.reasoning
        )

        calls: List[ToolCall] = []
        for idx in sorted(self.tool_calls.keys()):
            bucket = self.tool_calls[idx]
            calls.append(
                ToolCall(
                    id=bucket.id,
                    name=bucket.name,
                    raw_args=bucket.arg_buf,
                )
            )
        return final_message, calls
