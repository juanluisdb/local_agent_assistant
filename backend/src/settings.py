from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENROUTER_API_KEY: str
    TAVILY_API_KEY: str
    E2B_API_KEY: str
    DATABASE_URL: str = "sqlite+aiosqlite:///./chat.db"

    class Config:
        env_file = ".env"


settings = Settings()
