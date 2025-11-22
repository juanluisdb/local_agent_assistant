from abc import ABC, abstractmethod
from typing import Dict, Any

from pydantic import BaseModel


class Tool(ABC):
    name: str
    description: str
    input_model: type[BaseModel]
    
    @abstractmethod
    async def _execute(self, input_params: dict) -> str:
        pass

    async def execute(self, input_params: dict) -> str:
        try:
            return await self._execute(input_params)
        except Exception as e:
            return f"Error executing tool {self.name} with params {input_params}: {str(e)}"
        
    def to_openai_format(self) -> Dict[str, Any]:
        """Convert the tool to OpenAI's function calling format."""
        schema = self.input_model.model_json_schema()
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": schema
            }
        }