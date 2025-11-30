from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse

from .agent.core import Agent
from .models.requests import InteractionRequest

from .tools.search import SearchTool
from .tools.web_scraper import WebScraperTool
from .settings import settings

# Initialize FastAPI app
app = FastAPI(title="Agent API", version="0.1.0")

AGENT = Agent(
    model_name="openrouter/openai/gpt-oss-120b:exacto",
    system_prompt="You are a helpful assistant.",
    tools=[
        SearchTool(settings.TAVILY_API_KEY),
        WebScraperTool(settings.TAVILY_API_KEY),
    ],
)


@app.post("/chat/interaction")
async def create_interaction(request: InteractionRequest):
    async def event_generator():
        async for event in AGENT.run(user_input=request.user_message):
            yield event.model_dump_json()

    return EventSourceResponse(event_generator())


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
