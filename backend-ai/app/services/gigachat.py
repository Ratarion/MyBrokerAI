import asyncio
import base64
import json
import time
import urllib.parse
import urllib.request
import uuid

from app.config import settings


class GigaChatError(RuntimeError):
    pass


class GigaChatClient:
    def __init__(self) -> None:
        self._access_token: str | None = None
        self._expires_at: float = 0
        self._lock = asyncio.Lock()

    async def chat(self, messages: list[dict[str, str]]) -> str:
        token = await self._get_access_token()
        payload = {
            "model": settings.gigachat_model,
            "messages": messages,
            "temperature": 0.2,
            "stream": False,
        }
        return await asyncio.to_thread(self._post_chat, token, payload)

    async def _get_access_token(self) -> str:
        if self._access_token and time.time() < self._expires_at - 30:
            return self._access_token

        async with self._lock:
            if self._access_token and time.time() < self._expires_at - 30:
                return self._access_token
            token, expires_at = await asyncio.to_thread(self._request_token)
            self._access_token = token
            self._expires_at = expires_at
            return token

    def _request_token(self) -> tuple[str, float]:
        if not settings.gigachat_auth_key:
            raise GigaChatError("GIGACHAT_AUTH_KEY is not configured")

        body = urllib.parse.urlencode({"scope": settings.gigachat_scope}).encode()
        request = urllib.request.Request(
            "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "RqUID": str(uuid.uuid4()),
                "Authorization": f"Basic {settings.gigachat_auth_key}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                data = json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            raise GigaChatError(f"GigaChat token request failed: {exc}") from exc

        access_token = data.get("access_token")
        if not access_token:
            raise GigaChatError(f"GigaChat token response has no access_token: {data}")

        expires_at = float(data.get("expires_at", time.time() + 1800))
        return access_token, expires_at

    def _post_chat(self, token: str, payload: dict) -> str:
        url = f"{settings.gigachat_base_url.rstrip('/')}/v1/chat/completions"
        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                data = json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            raise GigaChatError(f"GigaChat chat request failed: {exc}") from exc

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GigaChatError(f"Unexpected GigaChat response: {data}") from exc
