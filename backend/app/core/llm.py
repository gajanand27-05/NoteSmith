from collections.abc import AsyncGenerator
from typing import Any

import ollama
from google import genai as google_genai

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

        self.gemini_key = settings.gemini_api_key
        self.gemini_chat_model = settings.gemini_chat_model

        self._cloud_client = None
        self._cloud_model = None

        if self.gemini_key:
            self._cloud_client = google_genai.Client(api_key=self.gemini_key)
            self._cloud_model = self.gemini_chat_model

    def is_available(self) -> bool:
        if self._cloud_client:
            return True
        try:
            self._client.list()
            return True
        except Exception:
            return False

    def list_models(self) -> list[str]:
        models = []
        if self._cloud_client:
            models.append(self._cloud_model)
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
        if self._cloud_client:
            return True
        return any(model in name for name in self.list_models())

    def chat(self, messages: list[dict[str, str]], stream: bool = False) -> Any:
        if self._cloud_client:
            raise NotImplementedError("Raw chat not supported with cloud models in this wrapper")
        return self._client.chat(
            model=self.chat_model,
            messages=messages,
            stream=stream,
        )

    def generate(self, prompt: str, stream: bool = False) -> Any:
        if self._cloud_client:
            raise NotImplementedError("Raw generate not supported with cloud models in this wrapper")
        return self._client.generate(
            model=self.chat_model,
            prompt=prompt,
            stream=stream,
        )

    def generate_text(self, prompt: str) -> str:
        if self._cloud_client:
            try:
                response = self._cloud_client.models.generate_content(
                    model=self._cloud_model,
                    contents=prompt,
                )
                return (response.text or "").strip()
            except Exception:
                pass

        response = self._client.generate(model=self.chat_model, prompt=prompt)
        text = getattr(response, "response", None)
        if text is None and isinstance(response, dict):
            text = response.get("response")
        return (text or "").strip()

    async def chat_stream(self, messages: list[dict[str, str]]) -> AsyncGenerator[str, None]:
        if self._cloud_client:
            try:
                prompt = "\n".join(f"{m['role']}: {m['content']}" for m in messages)
                response = self._cloud_client.models.generate_content_stream(
                    model=self._cloud_model,
                    contents=prompt,
                )
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
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
        if self._cloud_client:
            try:
                prompt = "\n".join(f"{m['role']}: {m['content']}" for m in messages)
                response = self._cloud_client.models.generate_content(
                    model=self._cloud_model,
                    contents=prompt,
                )
                return (response.text or "").strip()
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
