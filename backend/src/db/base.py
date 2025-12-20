from abc import ABC, abstractmethod
from ..models.chats import Chat, Interaction, AgentState, ChatWithInteractions


class DatabaseInterface(ABC):
    @abstractmethod
    async def create_chat(self, title: str = "Untitled Chat") -> str:
        """Create new chat, return chat_id"""
        pass

    @abstractmethod
    async def get_chat(self, chat_id: str, limit: int = 5) -> ChatWithInteractions:
        """Get complete chat with interactions"""
        pass

    @abstractmethod
    async def add_interaction(self, chat_id: str, interaction: Interaction) -> None:
        """Add interaction to chat"""
        pass

    @abstractmethod
    async def get_agent_state(
        self, chat_id: str, interaction_id: str | None = None
    ) -> AgentState | None:
        """Get agent state for continuing conversation.
        If interaction_id is provided, return state up to that interaction.
        If interaction_id is not provided, return final state of last interaction.
        """
        pass

    @abstractmethod
    async def list_chats(self, limit: int = 50) -> list[Chat]:
        """List recent chats"""
        pass
