import json
from pydantic import BaseModel, Field

from tavily import AsyncTavilyClient

from src.agent.tool import Tool


class SearchToolInput(BaseModel):
    query: str = Field(description="The search query string", min_length=1)


class SearchTool(Tool):
    name = "search"
    description = (
        "A tool searches the web for a given query and returns relevant results."
    )
    input_model = SearchToolInput

    def __init__(self, api_key: str, max_results: int = 10):
        self.client = AsyncTavilyClient(api_key=api_key)
        self.max_results = max_results

    async def _execute(self, input_params: str) -> str:
        parsed = json.loads(input_params)
        params = SearchToolInput.model_validate(parsed)
        results = await self.client.search(params.query, max_results=self.max_results)
        return json.dumps(results, indent=2)
