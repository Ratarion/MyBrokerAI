import os


class Settings:
    gigachat_auth_key: str = os.getenv("GIGACHAT_AUTH_KEY", "")
    gigachat_scope: str = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")
    gigachat_base_url: str = os.getenv("GIGACHAT_BASE_URL", "https://api.giga.chat")
    gigachat_model: str = os.getenv("GIGACHAT_MODEL", "GigaChat-3-Ultra")
    ai_internal_token: str = os.getenv("AI_INTERNAL_TOKEN", "")


settings = Settings()
