import asyncio

from src.agent.core import Agent
from src.tools.search import SearchTool
from src.settings import settings


async def main():
    agent = Agent(
        model_name="openrouter/minimax/minimax-m2:free",
        system_prompt="You are a helpful assistant.",
        tools=[SearchTool(settings.TAVILY_API_KEY)],
    )

    async for response in agent.run("Who is the current president of the United States?"):
        print(response)

if __name__ == "__main__":
    asyncio.run(main())