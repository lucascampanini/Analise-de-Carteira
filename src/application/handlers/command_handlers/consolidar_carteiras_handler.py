"""Handler: ConsolidarCarteirasHandler - orquestra a consolidação de carteiras."""

from __future__ import annotations

import structlog
from collections import defaultdict
from datetime import date, datetime
from uuid import UUID

from src.application.commands.consolidar_carteiras import (
    AtivoRFInput,
    ConsolidarCarteiras,
)
from src.application.dto.consolidacao_dto import (
    AcaoResumoDTO,
    AtivoRFResumoDTO,
    CenarioDTO,
    ConsolidacaoDTO,
    FluxoCaixaDTO,
    ProjecaoAnoDTO,
    ResumoIndexadorDTO,
)
from src.application.ports.outbound.focus_provider import FocusProvider
from src.domain.entities.detalhes_renda_fixa import DetalhesRendaFixa
from src.domain.services.calculador_ir_rf import CalculadorIrRf
from src.domain.services.gerador_fluxo_caixa import GeradorFluxoCaixa
from src.domain.services.projetor_patrimonio import ProjetorPatrimonio
from src.domain.value_objects.indexador_projecao import IndexadorProjecao
from src.domain.value_objects.indexador_renda_fixa import IndexadorRendaFixa
from src.domain.value_objects.premissas_mercado import PremissasMercado
from src.domain.value_objects.subtipo_renda_fixa import SubtipoRendaFixa

logger = structlog.get_logger(__name__)

# CDI vigente (14.90% a.a. em 12/03/2026 — BCB SGS série 12)
# Atualizar periodicamente ou injetar via BcbSgsProvider se necessário
_CDI_ATUAL_AA = 14.90

# Mapeamento tipo string → SubtipoRendaFixa (simplificado para o command)
_SUBTIPO_MAP: dict[str, SubtipoRendaFixa] = {
    "CDB":          SubtipoRendaFixa.CDB,
    "CRI":          SubtipoRendaFixa.CRI,
    "CRA":          SubtipoRendaFixa.CRA,
    "Debenture":    SubtipoRendaFixa.DEBENTURE_INCENTIVADA,
    "Tesouro IPCA": SubtipoRendaFixa.TESOURO_IPCA,
    "Tesouro Pre":  SubtipoRendaFixa.TESOURO_PREFIXADO,
    "Tesouro Selic":SubtipoRendaFixa.TESOURO_SELIC,
    "LCI":          SubtipoRendaFixa.LCI,
    "LCA":          SubtipoRendaFixa.LCA,
    "Fundo CDI":    SubtipoRendaFixa.CDB,    # proxy — fundos não têm SubtipoRendaFixa próprio
    "Fundo Multi":  SubtipoRendaFixa.CDB,
    "Fundo RV":     SubtipoRendaFixa.CDB,
}

# Mapeamento indexador string → IndexadorRendaFixa
_IDX_RF_MAP: dict[str, IndexadorRendaFixa] = {
    "CDI":   IndexadorRendaFixa.CDI_PERCENTUAL,
    "IPCA":  IndexadorRendaFixa.IPCA_MAIS,
    "Pre":   IndexadorRendaFixa.PREFIXADO,
    "PRE":   IndexadorRendaFixa.PREFIXADO,
    "Multi": IndexadorRendaFixa.CDI_MAIS,
    "MULTI": IndexadorRendaFixa.CDI_MAIS,
    "RV":    IndexadorRendaFixa.CDI_MAIS,
}


class ConsolidarCarteirasHandler:
    """Handler para o command ConsolidarCarteiras.

    Sequência de orquestração:
    1. Resolve PremissasMercado via Focus API (ou fallback)
    2. Para cada ativo: constrói DetalhesRendaFixa → GeradorFluxoCaixa
    3. Agrega todos os FluxoCaixa, ordena por data
    4. Calcula acumulado de reinvestimento (100% CDI)
    5. Projeta patrimônio anual por ativo via ProjetorPatrimonio
    6. Calcula cenários (BASE, OTIMISTA, PESSIMISTA, STRESS)
    7. Monta e retorna ConsolidacaoDTO
    """

    def __init__(
        self,
        focus_provider: FocusProvider,
        gerador_fluxo: GeradorFluxoCaixa,
        projetor: ProjetorPatrimonio,
        calculador_ir: CalculadorIrRf,
    ) -> None:
        self._focus = focus_provider
        self._gerador = gerador_fluxo
        self._projetor = projetor
        self._ir = calculador_ir

    async def handle(self, command: ConsolidarCarteiras) -> ConsolidacaoDTO:
        """Executa a consolidação e retorna o DTO completo."""
        data_base = date.today()
        anos = list(command.anos_projecao)

        # 1. Premissas de mercado
        premissas = await self._fetch_premissas(command, anos)
        logger.info("premissas_carregadas", fonte=premissas.fonte, anos=anos)

        # 2. Gerar fluxos de caixa para todos os ativos RF
        todos_fluxos = []
        for ativo in command.ativos_rf:
            detalhes = self._build_detalhes(ativo)
            if detalhes is None:
                continue
            idx_proj = IndexadorProjecao.from_string(ativo.indexador)
            fluxos = self._gerador.gerar(
                detalhes=detalhes,
                posicao=ativo.posicao,
                conta=ativo.conta,
                ativo_nome=ativo.nome,
                indexador_projecao=idx_proj,
                premissas=premissas,
                data_base=data_base,
                anos=anos,
            )
            todos_fluxos.extend(fluxos)

        todos_fluxos.sort(key=lambda f: f.data)

        # 3. Acumulado de reinvestimento por ano
        cf_por_ano: dict[int, float] = defaultdict(float)
        for cf in todos_fluxos:
            if cf.data.year in anos:
                cf_por_ano[cf.data.year] += cf.valor_liquido

        # 4. Totais
        total_rf = sum(a.posicao for a in command.ativos_rf)
        total_acoes = sum(a.posicao for a in command.acoes)
        total_geral = total_rf + total_acoes

        # 5. Resumo por indexador
        idx_totais: dict[str, float] = defaultdict(float)
        for a in command.ativos_rf:
            idx_totais[a.indexador] += a.posicao
        if command.acoes:
            idx_totais["Acoes"] += total_acoes
        resumo_idx = [
            ResumoIndexadorDTO(
                indexador=k,
                total=v,
                percentual=v / total_geral if total_geral else 0.0,
            )
            for k, v in idx_totais.items()
        ]

        # 6. Projeção anual
        projecao_por_ano = self._calcular_projecao_anual(
            command, premissas, data_base, anos, cf_por_ano, total_rf, total_acoes,
        )

        # 7. Cenários
        cenarios = self._calcular_cenarios(command, premissas, cf_por_ano, total_rf, anos)

        # 8. DTOs de fluxo de caixa com acumulado
        fluxos_dto = self._build_fluxos_dto(todos_fluxos, premissas, anos)

        # 9. Montar ConsolidacaoDTO
        return ConsolidacaoDTO(
            data_referencia=data_base.isoformat(),
            fonte_premissas=premissas.fonte,
            cdi_atual_aa=_CDI_ATUAL_AA,
            total_rf_fundos=total_rf,
            total_acoes=total_acoes,
            total_geral=total_geral,
            resumo_por_indexador=resumo_idx,
            ativos_rf=[self._ativo_to_dto(a) for a in command.ativos_rf],
            acoes=[
                AcaoResumoDTO(
                    ticker=a.ticker,
                    nome=a.nome,
                    conta=a.conta,
                    qtd=a.qtd,
                    ultimo_preco=a.ultimo_preco,
                    posicao=a.posicao,
                    percentual_carteira=a.posicao / total_geral if total_geral else 0.0,
                )
                for a in command.acoes
            ],
            fluxos_caixa=fluxos_dto,
            projecao_por_ano=projecao_por_ano,
            cenarios=cenarios,
            anos_projecao=anos,
        )

    # ── Helpers privados ──────────────────────────────────────────────────

    async def _fetch_premissas(
        self, command: ConsolidarCarteiras, anos: list[int]
    ) -> PremissasMercado:
        if not command.usar_focus_api:
            return PremissasMercado.fallback()
        try:
            return await self._focus.fetch_premissas(anos)
        except Exception as exc:
            logger.warning("focus_api_indisponivel", error=str(exc), fallback=True)
            return PremissasMercado.fallback()

    def _build_detalhes(self, ativo: AtivoRFInput) -> DetalhesRendaFixa | None:
        """Constrói DetalhesRendaFixa a partir do AtivoRFInput."""
        venc_str = ativo.data_vencimento
        if not venc_str:
            # Fundos abertos: sem fluxo de caixa individual
            return None

        try:
            venc = date.fromisoformat(venc_str)
        except ValueError:
            return None

        aplica = None
        if ativo.data_aplicacao:
            try:
                aplica = date.fromisoformat(ativo.data_aplicacao)
            except ValueError:
                pass

        subtipo = _SUBTIPO_MAP.get(ativo.tipo, SubtipoRendaFixa.CDB)
        idx_rf = _IDX_RF_MAP.get(ativo.indexador, IndexadorRendaFixa.CDI_PERCENTUAL)

        try:
            return DetalhesRendaFixa(
                ativo_id=UUID(int=0),   # placeholder — sem persistência
                subtipo=subtipo,
                indexador=idx_rf,
                taxa=ativo.taxa or 0.0,
                data_vencimento=venc,
                data_emissao=aplica,
                pmt_tipo=ativo.pmt_tipo,
                pmt_meses=list(ativo.pmt_meses),
                ntnb_coupon_flag=ativo.ntnb_coupon_flag,
                data_aplicacao=aplica,
            )
        except Exception as exc:
            logger.warning("build_detalhes_erro", ativo=ativo.nome, error=str(exc))
            return None

    def _calcular_projecao_anual(
        self,
        command: ConsolidarCarteiras,
        premissas: PremissasMercado,
        data_base: date,
        anos: list[int],
        cf_por_ano: dict[int, float],
        total_rf: float,
        total_acoes: float,
    ) -> list[ProjecaoAnoDTO]:
        result = []
        n_anos_total = len(anos)
        for i, yr in enumerate(sorted(anos), 1):
            tot = 0.0
            for ativo in command.ativos_rf:
                venc_str = ativo.data_vencimento
                venc = date.fromisoformat(venc_str) if venc_str else None
                if venc and date(yr, 1, 1) > venc:
                    continue
                idx_proj = IndexadorProjecao.from_string(ativo.indexador)
                tot += self._projetor.projetar_ativo(
                    posicao=ativo.posicao,
                    indexador=idx_proj,
                    taxa=ativo.taxa,
                    vencimento=venc,
                    face=ativo.face,
                    preco_unitario=ativo.preco_unitario,
                    premissas=premissas,
                    data_base=data_base,
                    ano_alvo=yr,
                )

            reinvest = self._projetor.projetar_reinvestimento(
                cf_por_ano, premissas, anos, yr,
            )
            tot += reinvest
            var = tot / total_rf - 1 if total_rf else 0.0
            cagr = (tot / total_rf) ** (1 / i) - 1 if total_rf and i > 0 else 0.0

            result.append(ProjecaoAnoDTO(
                ano=yr,
                total_rf_fundos=tot,
                total_acoes=total_acoes,
                total_geral=tot + total_acoes,
                variacao_vs_hoje=var,
                retorno_medio_aa=cagr,
                reinvestimento_acumulado=reinvest,
            ))
        return result

    def _calcular_cenarios(
        self,
        command: ConsolidarCarteiras,
        premissas_base: PremissasMercado,
        cf_por_ano: dict[int, float],
        total_rf: float,
        anos: list[int],
    ) -> list[CenarioDTO]:
        cenarios = []
        data_base = date.today()

        for cen in command.cenarios:
            prem_adj = premissas_base.com_ajuste(cen.delta_cdi, cen.delta_ipca)
            pat_por_ano: dict[int, float] = {}

            for i, yr in enumerate(sorted(anos), 1):
                tot = 0.0
                for ativo in command.ativos_rf:
                    venc_str = ativo.data_vencimento
                    venc = date.fromisoformat(venc_str) if venc_str else None
                    if venc and date(yr, 1, 1) > venc:
                        continue
                    idx_proj = IndexadorProjecao.from_string(ativo.indexador)
                    tot += self._projetor.projetar_ativo(
                        posicao=ativo.posicao,
                        indexador=idx_proj,
                        taxa=ativo.taxa,
                        vencimento=venc,
                        face=ativo.face,
                        preco_unitario=ativo.preco_unitario,
                        premissas=prem_adj,
                        data_base=data_base,
                        ano_alvo=yr,
                    )
                reinvest = self._projetor.projetar_reinvestimento(
                    cf_por_ano, prem_adj, anos, yr,
                )
                pat_por_ano[yr] = tot + reinvest

            ano_final = max(anos)
            pat_final = pat_por_ano.get(ano_final, 0.0)
            ganho = pat_final - total_rf
            ret_total = pat_final / total_rf - 1 if total_rf else 0.0
            n = len(anos)
            cagr = (pat_final / total_rf) ** (1 / n) - 1 if total_rf and n > 0 else 0.0

            cenarios.append(CenarioDTO(
                nome=cen.nome,
                delta_cdi=cen.delta_cdi,
                delta_ipca=cen.delta_ipca,
                patrimonio_por_ano=pat_por_ano,
                patrimonio_final=pat_final,
                ganho_absoluto=ganho,
                retorno_total=ret_total,
                cagr=cagr,
            ))

        return cenarios

    def _build_fluxos_dto(
        self,
        fluxos,
        premissas: PremissasMercado,
        anos: list[int],
    ) -> list[FluxoCaixaDTO]:
        """Converte FluxoCaixa entities em DTOs com acumulado de reinvestimento."""
        result = []
        cumul = 0.0
        fluxos_no_horizonte = [f for f in fluxos if f.data.year in anos]

        for i, cf in enumerate(fluxos_no_horizonte):
            yr = cf.data.year
            cdi_r = premissas.para_ano(yr).cdi_decimal
            if i > 0:
                days_diff = (cf.data - fluxos_no_horizonte[i - 1].data).days
                cumul *= (1 + cdi_r / 252) ** max(0, days_diff)
            cumul += cf.valor_liquido

            result.append(FluxoCaixaDTO(
                data=cf.data.isoformat(),
                ativo=cf.ativo_nome,
                conta=cf.conta,
                evento=cf.evento.value,
                valor_bruto=cf.valor_bruto,
                aliquota_ir=cf.aliquota_ir,
                valor_liquido=cf.valor_liquido,
                ir_isento=cf.ir_isento,
                acumulado_reinvest=cumul,
            ))

        return result

    def _ativo_to_dto(self, a: AtivoRFInput) -> AtivoRFResumoDTO:
        taxa_fmt = "—"
        if a.taxa is not None:
            if a.indexador == "CDI":
                taxa_fmt = f"{a.taxa:.0f}% CDI"
            elif a.indexador in ("IPCA", "Pre"):
                taxa_fmt = f"{a.taxa:.2f}% a.a."
            else:
                taxa_fmt = f"estimativa"

        return AtivoRFResumoDTO(
            nome=a.nome,
            conta=a.conta,
            tipo=a.tipo,
            indexador=a.indexador,
            taxa_formatada=taxa_fmt,
            data_aplicacao=a.data_aplicacao,
            data_vencimento=a.data_vencimento,
            posicao=a.posicao,
            ir_isento=a.ir_isento,
            nota=a.nota,
        )
