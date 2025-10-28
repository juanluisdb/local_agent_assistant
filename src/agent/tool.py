from abc import ABC, abstractmethod
from typing import Dict, Any

from pydantic import BaseModel


class Tool(ABC):
    name: str
    description: str
    input_model: type[BaseModel]
    
    @abstractmethod
    async def execute(self, input_params: dict) -> str:
        pass
        
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