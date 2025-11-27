from pydantic import BaseModel


class InteractionRequest(BaseModel):
    user_message: str
