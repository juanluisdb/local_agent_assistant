import json

import litellm
from litellm.types.utils import Message

from src.models.events import (
    AgentEvent,
    ToolCallEvent,
    ToolResultEvent,
    ThinkingEvent,
    AnswerEvent,
)

from .tool import Tool


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
                stream=False,
            )

            message = response.choices[0].message
            messages.append(message)

            if message.reasoning_content:
                yield ThinkingEvent(content=message.reasoning_content)
            if message.content:
                yield AnswerEvent(content=message.content)

            if not message.tool_calls:
                break

            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                tool_call_id = tool_call.id

                yield ToolCallEvent(
                    id=tool_call_id,
                    tool_name=tool_name,
                    tool_input=tool_call.function.arguments,
                )

                tool = self.tools[tool_name]
                tool_result = await tool.execute(tool_args)

                tool_message = Message(
                    role="tool",
                    content=tool_result,
                    tool_call_id=tool_call_id,
                    name=tool_name,
                )
                messages.append(tool_message)

                yield ToolResultEvent(
                    id=tool_call_id,
                    tool_name=tool_name,
                    tool_output=tool_result,
                )
