from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "NoteSmith"
    debug: bool = False

    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "gemma4:12b"
    ollama_embed_model: str = "nomic-embed-text"
    
    openrouter_api_key: str = ""
    openrouter_chat_model: str = "openai/gpt-oss-120b:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    chroma_persist_dir: str = "./data/chroma"
    upload_dir: str = "./data/uploads"

    chunk_size: int = 1000
    chunk_overlap: int = 200

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_db_url: str = ""

    cors_origins: list[str] = [
        "http://localhost:8501",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
