from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENROUTER_API_KEY: str
    TAVILY_API_KEY: str
    E2B_API_KEY: str
    
    class Config:
        env_file = ".env"

settings = Settings()