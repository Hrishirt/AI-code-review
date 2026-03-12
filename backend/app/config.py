from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/code_review"

    # Anthropic
    ANTHROPIC_API_KEY: str

    # GitHub
    GITHUB_WEBHOOK_SECRET: str = "your_webhook_secret"
    GITHUB_TOKEN: str = ""

    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
