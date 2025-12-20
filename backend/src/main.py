import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import SQLModel

from .agent.core import Agent
from .models.requests import InteractionRequest, CreateChatRequest
from .models.chats import Interaction, InteractionStatus, AgentState
from .models.events import AgentEvent

from .tools.search import SearchTool
from .tools.web_scraper import WebScraperTool
from .settings import settings

from .db.sqlite import SQLiteChatRepository

# Database Setup
engine = create_async_engine(settings.DATABASE_URL, echo=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


# Initialize FastAPI app
app = FastAPI(title="Agent API", version="0.1.0", lifespan=lifespan)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT = Agent(
    model_name="openrouter/openai/gpt-oss-120b:exacto",
    system_prompt="You are a helpful assistant.",
    tools=[
        SearchTool(settings.TAVILY_API_KEY),
        WebScraperTool(settings.TAVILY_API_KEY),
    ],
)


async def get_db_session():
    async with AsyncSession(engine) as session:
        yield session


@app.post("/chats")
async def create_chat(
    request: CreateChatRequest | None = None,
    session: AsyncSession = Depends(get_db_session),
):
    repo = SQLiteChatRepository(session)
    title = request.title if request and request.title else "Untitled Chat"
    chat_id = await repo.create_chat(title=title)
    return {"chat_id": chat_id}


@app.post("/chat/interaction")
async def create_interaction(
    request: InteractionRequest, session: AsyncSession = Depends(get_db_session)
):
    repo = SQLiteChatRepository(session)

    # Check if chat exists
    try:
        # We use get_chat just to check existence for now, or we could rely on FK constraint failure
        await repo.get_chat(request.chat_id, limit=0)
    except Exception:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Load previous state
    current_state = await repo.get_agent_state(request.chat_id)
    messages = current_state.messages if current_state else []
    print(f"DEBUG: Loaded {len(messages)} messages from DB for chat {request.chat_id}")
    if messages:
        print(f"DEBUG: Last message: {messages[-1]}")

    # We need to capture events to save them later
    captured_events: list[AgentEvent] = []

    async def event_generator():
        # Pass the 'messages' list. Agent.run will append new messages to it.
        print("DEBUG: Calling AGENT.run")
        async for event in AGENT.run(
            user_input=request.user_message, messages=messages
        ):
            captured_events.append(event)
            yield event.model_dump_json()

        print(f"DEBUG: Finished run. Total messages: {len(messages)}")
        # After streaming is done, save the interaction
        interaction = Interaction(
            id=str(uuid.uuid4()),
            chat_id=request.chat_id,
            status=InteractionStatus.COMPLETED,
            user_message=request.user_message,
            created_at=datetime.now(timezone.utc),
            agent_events=captured_events,
            final_agent_state=AgentState(messages=messages),
        )
        await repo.add_interaction(request.chat_id, interaction)
        print("DEBUG: Interaction saved")

    return EventSourceResponse(event_generator())


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
