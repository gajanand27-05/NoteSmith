from typing import Any

import ollama
from openai import OpenAI

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
        
        self.openai_key = settings.openai_api_key
        self.openai_chat_model = settings.openai_chat_model
        self._openai_client = OpenAI(api_key=self.openai_key) if self.openai_key else None

    def is_available(self) -> bool:
        if self._openai_client:
            return True
        try:
            self._client.list()
            return True
        except Exception:
            return False

    def list_models(self) -> list[str]:
        if self._openai_client:
            return [self.openai_chat_model]
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
        if self._openai_client:
            return True
        return any(model in name for name in self.list_models())

    def chat(self, messages: list[dict[str, str]], stream: bool = False) -> Any:
        if self._openai_client:
            # We don't implement full stream passthrough for OpenAI in this wrapper yet
            raise NotImplementedError("Raw chat not supported with OpenAI in this wrapper")
        return self._client.chat(
            model=self.chat_model,
            messages=messages,
            stream=stream,
        )

    def generate(self, prompt: str, stream: bool = False) -> Any:
        if self._openai_client:
            raise NotImplementedError("Raw generate not supported with OpenAI in this wrapper")
        return self._client.generate(
            model=self.chat_model,
            prompt=prompt,
            stream=stream,
        )

    def generate_text(self, prompt: str) -> str:
        if self._openai_client:
            response = self._openai_client.chat.completions.create(
                model=self.openai_chat_model,
                messages=[{"role": "user", "content": prompt}]
            )
            return (response.choices[0].message.content or "").strip()
            
        response = self._client.generate(model=self.chat_model, prompt=prompt)
        text = getattr(response, "response", None)
        if text is None and isinstance(response, dict):
            text = response.get("response")
        return (text or "").strip()

    def chat_text(self, messages: list[dict[str, str]]) -> str:
        if self._openai_client:
            response = self._openai_client.chat.completions.create(
                model=self.openai_chat_model,
                messages=messages
            )
            return (response.choices[0].message.content or "").strip()

        response = self._client.chat(model=self.chat_model, messages=messages)
        message = getattr(response, "message", None)
        if message is None and isinstance(response, dict):
            message = response.get("message")
        content = getattr(message, "content", None) if message else None
        if content is None and isinstance(message, dict):
            content = message.get("content")
        return (content or "").strip()

    def embed(self, text: str | list[str]) -> list[list[float]]:
        # Keep using local Ollama for embeddings
        inputs = [text] if isinstance(text, str) else text
        response = self._client.embed(model=self.embed_model, input=inputs)
        embeddings = getattr(response, "embeddings", None) or []
        return embeddings


llm = LLMClient()
