from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Eureka SST API"
    API_V1_PREFIX: str = "/api/v1"

    # ==========================
    # Base de datos
    # ==========================
    DATABASE_URL: str

    # ==========================
    # Seguridad / JWT
    # ==========================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ==========================
    # Almacenamiento de archivos
    # ==========================
    UPLOAD_DIR: str = "uploads"

    # ==========================
    # CORS
    # ==========================
    BACKEND_CORS_ORIGINS: Union[str, List[str]]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, value):
        if isinstance(value, str):
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]
        return value

    # ==========================
    # Configuración de Pydantic
    # ==========================
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()