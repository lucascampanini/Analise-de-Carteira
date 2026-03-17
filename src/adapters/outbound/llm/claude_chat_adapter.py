"""Adapter outbound: integração com Claude API para chat com tool use."""

from __future__ import annotations

from typing import Any

import anthropic

from src.application.ports.outbound.llm_port import LLMChatPort, LLMResponse, ToolCall


class ClaudeChatAdapter:
    """Implementa LLMChatPort usando a Anthropic Claude API.

    Realiza uma única chamada à API e devolve texto + tool_calls.
    O loop de ferramenta é responsabilidade do ChatHandler.
    """

    def __init__(self, api_key: str, model: str = "claude-opus-4-6") -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system: str,
    ) -> LLMResponse:
        """Envia mensagens ao Claude e retorna resposta estruturada."""
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            system=system,
            tools=tools,  # type: ignore[arg-type]
            messages=messages,  # type: ignore[arg-type]
        )

        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        input=dict(block.input),
                    )
                )

        return LLMResponse(
            text=" ".join(text_parts),
            tool_calls=tool_calls,
            stop_reason=response.stop_reason or "end_turn",
        )

    @staticmethod
    def serialize_assistant_content(llm_response: LLMResponse) -> list[dict[str, Any]]:
        """Serializa a resposta do assistente para o formato de histórico de mensagens."""
        content: list[dict[str, Any]] = []

        if llm_response.text:
            content.append({"type": "text", "text": llm_response.text})

        for tc in llm_response.tool_calls:
            content.append(
                {
                    "type": "tool_use",
                    "id": tc.id,
                    "name": tc.name,
                    "input": tc.input,
                }
            )

        return content
