import json
from collections.abc import AsyncGenerator
from typing import Any

import httpx
import ollama

from app.config import settings


class LLMClient:
    def __init__(
        self,
        base_url: str | None = None,
        chat_model: str | None = None,
        embed_model: str | None = None,
    ) -> None:
        self.base_url = base_url or settings.ollama_base_url
        self.chat_model = chat_model or settings.ollama_chat_model
        self.embed_model = embed_model or settings.ollama_embed_model
        self._client = ollama.Client(host=self.base_url)
        self._async_client = ollama.AsyncClient(host=self.base_url)

        self.openrouter_api_key = settings.openrouter_api_key
        self.openrouter_chat_model = settings.openrouter_chat_model
        self.openrouter_base_url = settings.openrouter_base_url

        self._cloud_headers = None
        if self.openrouter_api_key:
            self._cloud_headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "NoteSmith",
            }

    def _cloud_available(self) -> bool:
        return self._cloud_headers is not None

    def _openrouter_chat(self, messages: list[dict], stream: bool = False) -> dict:
        body = {
            "model": self.openrouter_chat_model,
            "messages": messages,
            "stream": stream,
        }
        with httpx.Client() as client:
            resp = client.post(
                f"{self.openrouter_base_url}/chat/completions",
                headers=self._cloud_headers,
                json=body,
                timeout=120,
            )
            resp.raise_for_status()
            return resp.json()

    async def _openrouter_chat_stream(
        self, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        body = {
            "model": self.openrouter_chat_model,
            "messages": messages,
            "stream": True,
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.openrouter_base_url}/chat/completions",
                headers=self._cloud_headers,
                json=body,
                timeout=120,
            ) as resp:
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    def is_available(self) -> bool:
        if self._cloud_available():
            return True
        try:
            self._client.list()
            return True
        except Exception:
            return False

    def list_models(self) -> list[str]:
        models = []
        if self._cloud_available():
            models.append(f"openrouter:{self.openrouter_chat_model}")
        try:
            response = self._client.list()
            for m in getattr(response, "models", []) or []:
                name = getattr(m, "model", None) or getattr(m, "name", None)
                if name is None and isinstance(m, dict):
                    name = m.get("model") or m.get("name")
                if name:
                    models.append(name)
        except Exception:
            pass
        return models

    def has_model(self, model: str) -> bool:
        return any(model in name for name in self.list_models())

    def chat(self, messages: list[dict[str, str]], stream: bool = False) -> Any:
        return self._client.chat(
            model=self.chat_model,
            messages=messages,
            stream=stream,
        )

    def generate(self, prompt: str, stream: bool = False) -> Any:
        return self._client.generate(
            model=self.chat_model,
            prompt=prompt,
            stream=stream,
        )

    def generate_text(self, prompt: str) -> str:
        if self._cloud_available():
            try:
                resp = self._openrouter_chat(
                    [{"role": "user", "content": prompt}]
                )
                return (resp["choices"][0]["message"]["content"] or "").strip()
            except Exception:
                pass

        response = self._client.generate(model=self.chat_model, prompt=prompt)
        text = getattr(response, "response", None)
        if text is None and isinstance(response, dict):
            text = response.get("response")
        return (text or "").strip()

    async def chat_stream(self, messages: list[dict[str, str]]) -> AsyncGenerator[str, None]:
        if self._cloud_available():
            try:
                async for token in self._openrouter_chat_stream(messages):
                    yield token
                return
            except Exception:
                pass

        stream = await self._async_client.chat(
            model=self.chat_model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content

    def chat_text(self, messages: list[dict[str, str]]) -> str:
        if self._cloud_available():
            try:
                resp = self._openrouter_chat(messages)
                return (resp["choices"][0]["message"]["content"] or "").strip()
            except Exception:
                pass

        response = self._client.chat(model=self.chat_model, messages=messages)
        message = getattr(response, "message", None)
        if message is None and isinstance(response, dict):
            message = response.get("message")
        content = getattr(message, "content", None) if message else None
        if content is None and isinstance(message, dict):
            content = message.get("content")
        return (content or "").strip()

    def embed(self, text: str | list[str]) -> list[list[float]]:
        inputs = [text] if isinstance(text, str) else text
        response = self._client.embed(model=self.embed_model, input=inputs)
        embeddings = getattr(response, "embeddings", None) or []
        return embeddings


llm = LLMClient()
