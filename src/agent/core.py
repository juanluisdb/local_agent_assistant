import litellm
import json
from .tool import Tool


class Agent:
    def __init__(self, model_name: str, system_prompt: str, tools: list[Tool]):
        self.model_name = model_name
        self.system_prompt = system_prompt
        self.tools = {tool.name: tool for tool in tools}
    
    async def run(self, user_input: str):
        # Simplified interaction loop
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_input}
        ]
        
        while True:
            response = await litellm.acompletion(
                model=self.model_name,
                messages=messages,
                tools=[tool.to_openai_format() for tool in self.tools.values()],
            )
            
            message = response.choices[0].message
            messages.append(message.dict())
            yield message
            if not message.tool_calls:
                break

            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                tool_call_id = tool_call.id
                
                tool = self.tools[tool_name]
                tool_result = await tool.execute(tool_args)
                
                tool_message = {
                    "role": "tool",
                    "name": tool_name,
                    "tool_call_id": tool_call_id,
                    "content": tool_result
                }
                messages.append(tool_message)
                yield tool_message


