"""Query Handler: GerarArgumentoVendaHandler."""

from __future__ import annotations

from uuid import UUID

from src.application.dto.argumento_venda_dto import (
    ArgumentoVendaDTO,
    ArgumentosVendaAnaliseDTO,
    ObjecaoRespostaDTO,
    SpinQuestoesDTO,
)
from src.application.ports.outbound.analise_carteira_repository import AnaliseCarteiraRepository
from src.application.ports.outbound.cliente_repository import ClienteRepository
from src.application.queries.gerar_argumento_venda import (
    GerarArgumentoVenda,
    GerarArgumentoVendaPorRecomendacao,
)
from src.domain.entities.analise_carteira import AnaliseCarteira
from src.domain.entities.cliente import Cliente
from src.domain.entities.recomendacao import Recomendacao
from src.domain.services.gerador_argumento_venda import GeradorArgumentoVenda
from src.domain.value_objects.argumento_venda import ArgumentoVenda


class GerarArgumentoVendaHandler:
    """Handler para as queries de geração de argumentos SPIN.

    Orquestra GeradorArgumentoVenda (domain service) e mapeia os resultados
    para os DTOs de saída da API.
    """

    def __init__(
        self,
        analise_repository: AnaliseCarteiraRepository,
        cliente_repository: ClienteRepository,
        gerador_argumento: GeradorArgumentoVenda,
    ) -> None:
        self._analise_repo = analise_repository
        self._cliente_repo = cliente_repository
        self._gerador = gerador_argumento

    async def handle(self, query: GerarArgumentoVenda) -> ArgumentosVendaAnaliseDTO | None:
        """Gera argumentos SPIN para todas as recomendações de uma análise.

        Args:
            query: Query com analise_id.

        Returns:
            ArgumentosVendaAnaliseDTO ou None se análise não encontrada.
        """
        analise = await self._analise_repo.find_by_id(UUID(query.analise_id))
        if analise is None:
            return None

        cliente = await self._cliente_repo.find_by_id(analise.cliente_id)
        if cliente is None:
            return None

        argumentos = self._gerar_argumentos(analise, cliente)

        return ArgumentosVendaAnaliseDTO(
            analise_id=query.analise_id,
            cliente_nome=cliente.nome,
            perfil_investidor=cliente.perfil.value,
            total_recomendacoes=len(analise.recomendacoes),
            argumentos=argumentos,
        )

    async def handle_por_recomendacao(
        self, query: GerarArgumentoVendaPorRecomendacao
    ) -> ArgumentoVendaDTO | None:
        """Gera argumento SPIN para uma recomendação específica.

        Args:
            query: Query com analise_id e recomendacao_id.

        Returns:
            ArgumentoVendaDTO ou None se não encontrado.
        """
        analise = await self._analise_repo.find_by_id(UUID(query.analise_id))
        if analise is None:
            return None

        cliente = await self._cliente_repo.find_by_id(analise.cliente_id)
        if cliente is None:
            return None

        rec_id = UUID(query.recomendacao_id)
        recomendacao = next(
            (r for r in analise.recomendacoes if r.id == rec_id), None
        )
        if recomendacao is None:
            return None

        argumento = self._gerador.gerar(
            recomendacao=recomendacao,
            cliente=cliente,
            percentual_rv=analise.percentual_rv or 0.0,
            percentual_rf=analise.percentual_rf or 0.0,
            cvar_mensal_reais=self._cvar_em_reais(analise),
            pl_total=analise.patrimonio_liquido,
        )

        return self._to_dto(recomendacao, argumento)

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _gerar_argumentos(
        self,
        analise: AnaliseCarteira,
        cliente: Cliente,
    ) -> list[ArgumentoVendaDTO]:
        cvar_reais = self._cvar_em_reais(analise)

        argumentos: list[ArgumentoVendaDTO] = []
        for recomendacao in analise.recomendacoes:
            argumento = self._gerador.gerar(
                recomendacao=recomendacao,
                cliente=cliente,
                percentual_rv=analise.percentual_rv or 0.0,
                percentual_rf=analise.percentual_rf or 0.0,
                cvar_mensal_reais=cvar_reais,
                pl_total=analise.patrimonio_liquido,
            )
            argumentos.append(self._to_dto(recomendacao, argumento))

        return argumentos

    @staticmethod
    def _cvar_em_reais(analise: AnaliseCarteira) -> float | None:
        if analise.cvar_95 is not None and analise.patrimonio_liquido:
            return abs(analise.cvar_95 / 100) * analise.patrimonio_liquido
        return None

    @staticmethod
    def _to_dto(rec: Recomendacao, arg: ArgumentoVenda) -> ArgumentoVendaDTO:
        return ArgumentoVendaDTO(
            recomendacao_id=str(rec.id),
            tipo_recomendacao=rec.tipo.value,
            ticker=rec.ticker,
            justificativa=rec.justificativa,
            spin=SpinQuestoesDTO(
                situation=list(arg.perguntas_situation),
                problem=list(arg.perguntas_problem),
                implication=list(arg.perguntas_implication),
                need_payoff=list(arg.perguntas_need_payoff),
            ),
            challenger_reframe=arg.challenger_reframe,
            script_whatsapp=arg.script_whatsapp,
            objecoes_previstas=[
                ObjecaoRespostaDTO(objecao=o, resposta=r)
                for o, r in arg.objecoes_previstas
            ],
            dados_quantitativos=arg.dados_quantitativos,
        )
