from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "NayaPotha.ai API"
    API_V1_PREFIX: str = "/api/v1"
    MONGODB_URI: str
    MONGODB_DATABASE: str = "nayapotha"
    JWT_SECRET_KEY: str
    JWT_ACCESS_TOKEN_MINUTES: int = 15
    JWT_REFRESH_TOKEN_DAYS: int = 30
    ALLOWED_ORIGINS: str = "http://localhost:8081"
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()