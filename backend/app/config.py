from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    GOOGLE_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()

