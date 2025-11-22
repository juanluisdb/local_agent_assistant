import json
from pydantic import BaseModel, Field, HttpUrl

from tavily import AsyncTavilyClient

from src.agent.tool import Tool

class WebScraperToolInput(BaseModel):
    url: HttpUrl = Field(description="The URL to scrape content from")

class WebScraperTool(Tool):
    name = "web_scraper"
    description = "A tool to scrape content from a given URL."
    input_model = WebScraperToolInput

    def __init__(self, api_key: str):
        self.client = AsyncTavilyClient(api_key=api_key)

    async def _execute(self, input_params: dict) -> str:
        params = WebScraperToolInput.model_validate(input_params)
        results = await self.client.extract(urls=[str(params.url)])

        return json.dumps(results, indent=2)
    