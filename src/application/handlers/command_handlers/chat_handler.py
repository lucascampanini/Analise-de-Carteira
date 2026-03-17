"""ChatHandler: orquestra conversa via LLM com tool use sobre os use cases existentes."""

from __future__ import annotations

import json
import uuid
from typing import Any

from src.application.commands.analisar_carteira import AnalisarCarteira
from src.application.commands.criar_cliente import CriarCliente
from src.application.handlers.command_handlers.analisar_carteira_handler import (
    AnalisarCarteiraHandler,
)
from src.application.handlers.command_handlers.criar_cliente_handler import CriarClienteHandler
from src.application.handlers.query_handlers.get_analise_carteira_handler import (
    GetAnaliseCarteiraHandler,
)
from src.application.ports.outbound.llm_port import LLMChatPort, LLMResponse
from src.application.queries.get_analise_carteira import GetAnaliseCarteira

# ---------------------------------------------------------------------------
# Definição das ferramentas expostas ao Claude
# ---------------------------------------------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "name": "criar_cliente",
        "description": (
            "Cadastra um novo cliente no sistema com seu perfil de investidor, objetivo financeiro "
            "e horizonte de investimento. Retorna o ID único do cliente cadastrado."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "nome": {"type": "string", "description": "Nome completo do cliente"},
                "cpf": {
                    "type": "string",
                    "description": "CPF do cliente (somente dígitos ou formatado com pontos/traço)",
                },
                "perfil": {
                    "type": "string",
                    "enum": ["CONSERVADOR", "MODERADO", "ARROJADO"],
                    "description": (
                        "Perfil de risco: CONSERVADOR (RF > 70%), "
                        "MODERADO (RF 40-70%), ARROJADO (RV > 60%)"
                    ),
                },
                "objetivo": {
                    "type": "string",
                    "enum": [
                        "PRESERVACAO_CAPITAL",
                        "RENDA_PASSIVA",
                        "CRESCIMENTO_PATRIMONIAL",
                        "APOSENTADORIA",
                        "RESERVA_EMERGENCIA",
                    ],
                    "description": "Objetivo financeiro principal do investidor",
                },
                "horizonte": {
                    "type": "string",
                    "enum": ["CURTO_PRAZO", "MEDIO_PRAZO", "LONGO_PRAZO"],
                    "description": (
                        "Horizonte de investimento: CURTO_PRAZO (< 2 anos), "
                        "MEDIO_PRAZO (2-5 anos), LONGO_PRAZO (> 5 anos)"
                    ),
                },
                "tolerancia_perda_percentual": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Tolerância máxima a perdas em % do patrimônio (0-100)",
                },
            },
            "required": [
                "nome",
                "cpf",
                "perfil",
                "objetivo",
                "horizonte",
                "tolerancia_perda_percentual",
            ],
        },
    },
    {
        "name": "buscar_analise",
        "description": (
            "Busca e retorna o resultado completo de uma análise de carteira pelo ID, incluindo "
            "alocação, métricas de risco (CVaR 95%, volatilidade, beta), score de aderência ao "
            "perfil e recomendações de rebalanceamento."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "analise_id": {"type": "string", "description": "ID único da análise de carteira"},
            },
            "required": ["analise_id"],
        },
    },
    {
        "name": "analisar_carteira",
        "description": (
            "Solicita nova análise quantitativa de uma carteira existente. Calcula alocação por "
            "classe/setor/emissor, concentração (HHI), risco (CVaR 95%, volatilidade anualizada, "
            "beta vs IBOV), aderência ao perfil e gera recomendações de rebalanceamento. "
            "Retorna o ID da análise gerada."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "carteira_id": {
                    "type": "string",
                    "description": "ID da carteira a ser analisada",
                },
                "cliente_id": {
                    "type": "string",
                    "description": "ID do cliente dono da carteira",
                },
            },
            "required": ["carteira_id", "cliente_id"],
        },
    },
]

SYSTEM_PROMPT = """Você é o **Assessor Bot**, assistente especializado em análise de carteiras de investimento para assessores do mercado financeiro brasileiro (B3).

## Suas ferramentas
- **criar_cliente**: Cadastrar novo cliente com perfil de investidor
- **buscar_analise**: Consultar resultado completo de uma análise de carteira
- **analisar_carteira**: Solicitar nova análise quantitativa de uma carteira existente

## Para processar extrato PDF
Oriente o assessor a enviar o arquivo PDF diretamente no chat. O sistema processará automaticamente e retornará o ID da análise gerada.

## Diretrizes
- Responda sempre em **português do Brasil**
- Use linguagem do mercado financeiro brasileiro: CDI, IBOV, FII, Selic, RV, RF, CVaR, HHI, B3
- Ao apresentar análises, destaque: score de aderência ao perfil, alertas de concentração e recomendações de rebalanceamento
- Se aderência < 70, explique o que está fora do perfil e quais ajustes são recomendados
- Seja objetivo e profissional — o assessor usará suas respostas para embasar reuniões com clientes
- Quando apresentar números financeiros, formate adequadamente (ex: 85.3% de RF, CVaR 95% de -4.2%)"""

# Número máximo de iterações de tool use por mensagem
_MAX_TOOL_ITERATIONS = 5


class ChatHandler:
    """Orquestra conversa em linguagem natural com tool use sobre os use cases do domínio.

    Mantém o loop de ferramenta: Claude → tool_use → executar → tool_result → Claude...
    até atingir end_turn ou o limite de iterações.
    """

    def __init__(
        self,
        llm_port: LLMChatPort,
        criar_cliente_handler: CriarClienteHandler,
        analisar_carteira_handler: AnalisarCarteiraHandler,
        get_analise_handler: GetAnaliseCarteiraHandler,
    ) -> None:
        self._llm = llm_port
        self._criar_cliente = criar_cliente_handler
        self._analisar_carteira = analisar_carteira_handler
        self._get_analise = get_analise_handler

    async def handle(
        self,
        user_message: str,
        conversation_history: list[dict[str, Any]],
    ) -> tuple[str, list[dict[str, Any]]]:
        """Processa a mensagem do usuário com Claude e tool use.

        Args:
            user_message: Texto enviado pelo assessor.
            conversation_history: Histórico anterior da conversa (lista de mensagens Anthropic).

        Returns:
            Tupla (resposta_final_em_texto, historico_atualizado).
        """
        messages: list[dict[str, Any]] = [
            *conversation_history,
            {"role": "user", "content": user_message},
        ]

        for _ in range(_MAX_TOOL_ITERATIONS):
            llm_response: LLMResponse = await self._llm.chat(
                messages=messages,
                tools=TOOLS,
                system=SYSTEM_PROMPT,
            )

            assistant_content = self._serialize_response(llm_response)
            messages.append({"role": "assistant", "content": assistant_content})

            if not llm_response.has_tool_calls:
                # Resposta final em texto — encerra o loop
                return llm_response.text or "...", messages

            # Executa todas as ferramentas solicitadas e coleta os resultados
            tool_results: list[dict[str, Any]] = []
            for tool_call in llm_response.tool_calls:
                result = await self._execute_tool(tool_call.name, tool_call.input)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_call.id,
                        "content": result,
                    }
                )

            messages.append({"role": "user", "content": tool_results})

        return "Não consegui processar sua solicitação. Tente novamente.", messages

    # ------------------------------------------------------------------
    # Execução de ferramentas
    # ------------------------------------------------------------------

    async def _execute_tool(self, tool_name: str, tool_input: dict[str, Any]) -> str:
        """Despacha a chamada de ferramenta para o handler correto."""
        try:
            if tool_name == "criar_cliente":
                return await self._tool_criar_cliente(tool_input)
            if tool_name == "buscar_analise":
                return await self._tool_buscar_analise(tool_input)
            if tool_name == "analisar_carteira":
                return await self._tool_analisar_carteira(tool_input)
            return json.dumps({"erro": f"Ferramenta desconhecida: {tool_name}"})
        except Exception as exc:
            return json.dumps({"erro": f"Falha ao executar '{tool_name}': {exc}"})

    async def _tool_criar_cliente(self, inputs: dict[str, Any]) -> str:
        command = CriarCliente(
            nome=str(inputs["nome"]),
            cpf=str(inputs["cpf"]),
            perfil=str(inputs["perfil"]),
            objetivo=str(inputs["objetivo"]),
            horizonte=str(inputs["horizonte"]),
            tolerancia_perda_percentual=float(inputs["tolerancia_perda_percentual"]),
            idempotency_key=str(uuid.uuid4()),
        )
        cliente_id = await self._criar_cliente.handle(command)
        return json.dumps({"cliente_id": cliente_id, "status": "cadastrado_com_sucesso"})

    async def _tool_buscar_analise(self, inputs: dict[str, Any]) -> str:
        query = GetAnaliseCarteira(analise_id=str(inputs["analise_id"]))
        dto = await self._get_analise.handle(query)
        if dto is None:
            return json.dumps({"erro": f"Análise '{inputs['analise_id']}' não encontrada"})
        # Serializa o DTO removendo campos None para compactar o payload ao Claude
        data = {k: v for k, v in dto.__dict__.items() if v is not None}
        return json.dumps(data, default=str)

    async def _tool_analisar_carteira(self, inputs: dict[str, Any]) -> str:
        command = AnalisarCarteira(
            carteira_id=str(inputs["carteira_id"]),
            cliente_id=str(inputs["cliente_id"]),
            idempotency_key=str(uuid.uuid4()),
        )
        analise_id = await self._analisar_carteira.handle(command)
        return json.dumps({"analise_id": analise_id, "status": "analise_concluida"})

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _serialize_response(response: LLMResponse) -> list[dict[str, Any]]:
        """Converte LLMResponse para o formato de histórico da Anthropic API."""
        content: list[dict[str, Any]] = []
        if response.text:
            content.append({"type": "text", "text": response.text})
        for tc in response.tool_calls:
            content.append(
                {"type": "tool_use", "id": tc.id, "name": tc.name, "input": tc.input}
            )
        return content
