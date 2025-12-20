from pydantic import BaseModel


class InteractionRequest(BaseModel):
    chat_id: str
    user_message: str


class CreateChatRequest(BaseModel):
    title: str | None = None
