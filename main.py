import asyncio
from pydantic import BaseModel
from src.agent.core import Agent
from src.agent.tool import Tool

class SumToolInput(BaseModel):
    a: int
    b: int

class SumTool(Tool):
    name = "sum_tool"
    description = "A tool that sums two integers."
    input_model = SumToolInput

    async def execute(self, input_params: dict) -> str:
        params = SumToolInput.model_validate(input_params)
        result = params.a + params.b
        return str(result)


async def main():
    agent = Agent(
        model_name="openrouter/minimax/minimax-m2:free",
        system_prompt="You are a helpful assistant.",
        tools=[SumTool()],
    )

    async for response in agent.run("What is the sum of 5 and 7 using the sum_tool?"):
        print(response)

if __name__ == "__main__":
    asyncio.run(main())