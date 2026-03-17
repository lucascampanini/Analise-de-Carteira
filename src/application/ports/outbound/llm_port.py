"""Port (outbound): abstração para comunicação com LLM."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class ToolCall:
    """Representa uma chamada de ferramenta solicitada pelo LLM."""

    id: str
    name: str
    input: dict[str, Any]


@dataclass(frozen=True)
class LLMResponse:
    """Resposta de uma única chamada ao LLM."""

    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"

    @property
    def has_tool_calls(self) -> bool:
        return len(self.tool_calls) > 0


class LLMChatPort(Protocol):
    """Port para comunicação com modelos de linguagem via chat."""

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system: str,
    ) -> LLMResponse:
        """Envia mensagens ao LLM e retorna a resposta com possíveis tool calls."""
        ...
