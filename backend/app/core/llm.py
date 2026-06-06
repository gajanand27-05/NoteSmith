from typing import Any

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

    def is_available(self) -> bool:
        try:
            self._client.list()
            return True
        except Exception:
            return False

    def list_models(self) -> list[str]:
        try:
            response = self._client.list()
            names: list[str] = []
            for m in getattr(response, "models", []) or []:
                name = getattr(m, "model", None) or getattr(m, "name", None)
                if name is None and isinstance(m, dict):
                    name = m.get("model") or m.get("name")
                if name:
                    names.append(name)
            return names
        except Exception:
            return []

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
        response = self._client.generate(model=self.chat_model, prompt=prompt)
        return (getattr(response, "response", "") or "").strip()

    def chat_text(self, messages: list[dict[str, str]]) -> str:
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
