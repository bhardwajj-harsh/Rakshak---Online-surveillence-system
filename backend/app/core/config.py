"""Application configuration."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite:///./rakshak.db"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_url: str = "http://localhost:8000"

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Demo
    demo_mode: bool = True

    # Hardware Camera Capture
    enable_hardware_camera: bool = True

    # ML
    model_path: str = "./ml/models"
    frame_skip: int = 3

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
