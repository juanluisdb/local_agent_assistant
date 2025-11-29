import asyncio
import litellm
from litellm.types.utils import Message
from typing import Any, AsyncIterator

from src.models.events import AgentEvent, ToolCallEvent, ToolResultEvent

from .tool import Tool
from .streaming import StreamAccumulator


class Agent:
    def __init__(self, model_name: str, system_prompt: str, tools: list[Tool]):
        self.model_name = model_name
        self.system_prompt = system_prompt
        self.tools = {tool.name: tool for tool in tools}

    async def run(self, user_input: str, messages: list[Message] | None = None):
        if not messages:
            messages = [Message(role="system", content=self.system_prompt)]
        messages.append(Message(role="user", content=user_input))

        while True:
            response = await litellm.acompletion(
                model=self.model_name,
                messages=[msg.model_dump() for msg in messages],
                tools=[tool.to_openai_format() for tool in self.tools.values()],
                stream=True,
            )

            acc = StreamAccumulator()
            stream_iter: AsyncIterator[Any] = response  # type: ignore
            async for chunk in stream_iter:
                for e in acc.accumulate(chunk.choices[0].delta):
                    yield e

            final_msg, tool_calls = acc.finalize()
            messages.append(final_msg)

            # If the ai finished and didn't produce any tool calls, stop the loop
            if not tool_calls:
                break

            # Emit ToolCallEvent for each tool call and prepare to execute
            executable_calls = []
            for tc in tool_calls:
                if not tc.name or tc.name not in self.tools:
                    err = f"Unknown tool: {tc.name}"
                    messages.append(
                        Message(
                            role="tool",
                            content=err,
                            tool_call_id=tc.id,
                            name=tc.name,
                        )
                    )
                    yield ToolResultEvent(
                        id=tc.id,
                        tool_name=tc.name,
                        tool_output=err,
                        success=False,
                    )
                    continue

                yield ToolCallEvent(id=tc.id, tool_name=tc.name, tool_input=tc.raw_args)
                executable_calls.append((tc.id, tc.name, tc.raw_args))

            # Execute tools concurrently using asyncio.gather
            tasks = [
                asyncio.create_task(self.tools[name].execute(call_id, raw_args))
                for call_id, name, raw_args in executable_calls
            ]
            if tasks:
                results = await asyncio.gather(*tasks)
                for result_event in results:
                    # Tool.execute always returns ToolResultEvent, so we can yield it directly
                    messages.append(
                        Message(
                            role="tool",
                            content=result_event.tool_output,
                            tool_call_id=result_event.id,
                            name=result_event.tool_name,
                        )
                    )
                    yield result_event

            continue
