import asyncio

from src.agent.core import Agent
from src.tools.search import SearchTool
from src.tools.code_interpret import CodeInterpretTool
from src.tools.web_scraper import WebScraperTool
from src.settings import settings


async def main():
    agent = Agent(
        model_name="openrouter/qwen/qwen3-coder-30b-a3b-instruct",
        system_prompt="You are a helpful assistant.",
        tools=[
            SearchTool(settings.TAVILY_API_KEY),
            CodeInterpretTool(settings.E2B_API_KEY),
            WebScraperTool(settings.TAVILY_API_KEY),
        ],
    )

    async for response in agent.run("summarize the wikipedia page for Jerez de la Frontera"):
        print(response)
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())