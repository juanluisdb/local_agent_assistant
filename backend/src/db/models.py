from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON


class ChatTable(SQLModel, table=True):
    __tablename__ = "chats"
    id: str = Field(primary_key=True)
    title: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    interactions: List["InteractionTable"] = Relationship(back_populates="chat")


class InteractionTable(SQLModel, table=True):
    __tablename__ = "interactions"
    id: str = Field(primary_key=True)
    chat_id: str = Field(foreign_key="chats.id")
    status: str
    user_message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # JSON columns for complex nested structures
    # We store the raw dict/json representation of the events and state here
    agent_events: List[Dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSON)
    )
    final_agent_state: Dict[str, Any] = Field(
        default_factory=dict, sa_column=Column(JSON)
    )

    chat: Optional[ChatTable] = Relationship(back_populates="interactions")
