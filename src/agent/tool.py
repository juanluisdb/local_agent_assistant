from abc import ABC, abstractmethod
from typing import Dict, Any

from pydantic import BaseModel

from src.models.events import ToolResultEvent


class Tool(ABC):
    name: str
    description: str
    input_model: type[BaseModel]

    @abstractmethod
    async def _execute(self, input_params: str) -> str:
        """Execute the tool and return the output as a string.

        Subclasses implement this and return the result as a string.
        The base class execute() wraps this with error handling and returns ToolResultEvent.
        """
        pass

    async def execute(self, tool_call_id: str, input_params: str) -> ToolResultEvent:
        """Execute the tool with error handling and return a ToolResultEvent.

        This method wraps _execute, handles exceptions, and always returns a ToolResultEvent
        with appropriate success flag set.
        """
        try:
            output = await self._execute(input_params)
            return ToolResultEvent(
                id=tool_call_id,
                tool_name=self.name,
                tool_output=output,
                success=True,
            )
        except Exception as e:
            error_msg = f"Error executing tool {self.name}: {str(e)}"
            return ToolResultEvent(
                id=tool_call_id,
                tool_name=self.name,
                tool_output=error_msg,
                success=False,
            )

    def to_openai_format(self) -> Dict[str, Any]:
        """Convert the tool to OpenAI's function calling format."""
        schema = self.input_model.model_json_schema()
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": schema,
            },
        }
