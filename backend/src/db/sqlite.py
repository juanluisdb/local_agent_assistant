import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import TypeAdapter
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from .base import DatabaseInterface
from .models import ChatTable, InteractionTable
from ..models.chats import Chat, Interaction, AgentState, ChatWithInteractions
from ..models.events import AgentEvent


class SQLiteChatRepository(DatabaseInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_chat(self, title: str = "Untitled Chat") -> str:
        chat_id = str(uuid.uuid4())
        chat = ChatTable(id=chat_id, title=title)
        self.session.add(chat)
        await self.session.commit()
        return chat_id

    async def get_chat(self, chat_id: str, limit: int = 5) -> ChatWithInteractions:
        # Load chat metadata first
        chat_table = await self.session.get(ChatTable, chat_id)
        if not chat_table:
            raise ValueError(f"Chat {chat_id} not found")

        # Load recent interactions efficiently with SQL
        statement = (
            select(InteractionTable)
            .where(InteractionTable.chat_id == chat_id)
            .order_by(desc(InteractionTable.created_at))
            .limit(limit)
        )
        result = await self.session.exec(statement)
        # We need to reverse them to be in chronological order for the UI/History
        # DB gives us [Newest -> Oldest] (desc), we want [Oldest -> Newest]
        recent_interactions = list(reversed(result.all()))

        domain_interactions = []
        for i in recent_interactions:
            domain_interactions.append(self._to_domain_interaction(i))

        return ChatWithInteractions(
            chat=Chat(
                id=chat_table.id,
                title=chat_table.title,
                created_at=chat_table.created_at,
                updated_at=chat_table.updated_at,
            ),
            interactions=domain_interactions,
        )

    async def add_interaction(self, chat_id: str, interaction: Interaction) -> None:
        # Convert domain model to DB model
        db_interaction = InteractionTable(
            id=interaction.id,
            chat_id=chat_id,
            status=interaction.status,
            user_message=interaction.user_message,
            created_at=interaction.created_at,
            # Serialize complex types to dict/JSON-compatible format
            agent_events=[event.model_dump() for event in interaction.agent_events],
            final_agent_state=interaction.final_agent_state.model_dump(),
        )
        self.session.add(db_interaction)

        # Update chat updated_at
        chat = await self.session.get(ChatTable, chat_id)
        if chat:
            chat.updated_at = datetime.now(timezone.utc)
            self.session.add(chat)

        await self.session.commit()

    async def get_agent_state(
        self, chat_id: str, interaction_id: str | None = None
    ) -> AgentState | None:
        query = select(InteractionTable).where(InteractionTable.chat_id == chat_id)

        if interaction_id:
            query = query.where(InteractionTable.id == interaction_id)
        else:
            # Get latest
            query = query.order_by(desc(InteractionTable.created_at))

        result = await self.session.exec(query)
        interaction_table = result.first()

        if not interaction_table:
            return None

        return AgentState.model_validate(interaction_table.final_agent_state)

    async def list_chats(self, limit: int = 50) -> list[Chat]:
        statement = select(ChatTable).order_by(desc(ChatTable.updated_at)).limit(limit)
        result = await self.session.exec(statement)
        chats = result.all()

        return [
            Chat(
                id=c.id,
                title=c.title or "Untitled",
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in chats
        ]

    def _to_domain_interaction(self, i: InteractionTable) -> Interaction:
        # Use TypeAdapter to handle List[Union] validation
        events_adapter = TypeAdapter(list[AgentEvent])
        events = events_adapter.validate_python(i.agent_events)

        return Interaction(
            id=i.id,
            chat_id=i.chat_id,
            status=i.status,  # type: ignore
            user_message=i.user_message,
            created_at=i.created_at,
            agent_events=events,
            final_agent_state=AgentState.model_validate(i.final_agent_state),
        )
