"""Domain Service GeradorFluxoCaixa - agenda de pagamentos de RF."""

from __future__ import annotations

from datetime import date

from src.domain.entities.detalhes_renda_fixa import DetalhesRendaFixa
from src.domain.entities.fluxo_caixa import FluxoCaixa, TipoEventoCaixa
from src.domain.services.calculador_ir_rf import CalculadorIrRf
from src.domain.value_objects.indexador_projecao import IndexadorProjecao
from src.domain.value_objects.premissas_mercado import PremissasMercado

# Constante: cupom semestral NTN-B = taxa 6% real a.a. ≡ (1.06^0.5 - 1) = 2.9563%
_NTNB_COUPON_SEMESTRAL = 0.029563


class GeradorFluxoCaixa:
    """Gera a agenda de pagamentos projetados para ativos de Renda Fixa.

    Stateless. Opera sobre um único ativo por chamada.
    Tipos de pagamento suportados:
      - bullet: único evento no vencimento (CDB, LTN, NTNB PRINC)
      - semestral: cupons em pmt_meses + amortização final (NTN-B, CRI, CRA, DEB)
    """

    _NTNB_COUPON = _NTNB_COUPON_SEMESTRAL

    def __init__(self, calculador_ir: CalculadorIrRf) -> None:
        self._ir = calculador_ir

    def gerar(
        self,
        detalhes: DetalhesRendaFixa,
        posicao: float,
        conta: str,
        ativo_nome: str,
        indexador_projecao: IndexadorProjecao,
        premissas: PremissasMercado,
        data_base: date,
        anos: list[int],
    ) -> list[FluxoCaixa]:
        """Gera todos os eventos de caixa para um ativo entre data_base e max(anos).

        Args:
            detalhes: Dados do título (vencimento, pmt_tipo, pmt_meses, etc.).
            posicao: Valor atual da posição em R$.
            conta: Identificador da conta do cliente.
            ativo_nome: Nome do ativo para exibição.
            indexador_projecao: Bucket de indexação para projeção.
            premissas: Expectativas de mercado Focus por ano.
            data_base: Data de referência atual (hoje).
            anos: Lista de anos do horizonte de projeção.

        Returns:
            Lista de FluxoCaixa ordenada por data.
        """
        venc = detalhes.data_vencimento
        pmt_tipo = detalhes.pmt_tipo
        ir_isento = detalhes.isento_ir
        data_aplica = detalhes.data_aplicacao

        fluxos: list[FluxoCaixa] = []

        if pmt_tipo == "bullet":
            fluxos.extend(self._gerar_bullet(
                detalhes, posicao, conta, ativo_nome,
                indexador_projecao, premissas, data_base, anos, venc,
                ir_isento, data_aplica,
            ))
        elif pmt_tipo == "semestral" and detalhes.pmt_meses:
            fluxos.extend(self._gerar_semestral(
                detalhes, posicao, conta, ativo_nome,
                indexador_projecao, premissas, data_base, anos, venc,
                ir_isento, data_aplica,
            ))

        fluxos.sort(key=lambda f: f.data)
        return fluxos

    # ── Bullet ────────────────────────────────────────────────────────────

    def _gerar_bullet(
        self,
        detalhes: DetalhesRendaFixa,
        posicao: float,
        conta: str,
        nome: str,
        idx: IndexadorProjecao,
        premissas: PremissasMercado,
        data_base: date,
        anos: list[int],
        venc: date,
        ir_isento: bool,
        data_aplica: date | None,
    ) -> list[FluxoCaixa]:
        """Cria evento único de vencimento para títulos bullet."""
        ano_max = max(anos)
        if venc <= data_base or venc.year > ano_max:
            return []

        valor_final = self._projetar_valor(posicao, detalhes, premissas, data_base, venc.year)
        aliq, valor_ir = self._ir.calcular_ir_vencimento(
            valor_final, posicao, data_aplica, venc, ir_isento,
        )
        valor_liq = valor_final - valor_ir

        return [FluxoCaixa(
            id=__import__("uuid").uuid4(),
            ativo_nome=nome,
            conta=conta,
            data=venc,
            evento=TipoEventoCaixa.VENCIMENTO,
            valor_bruto=valor_final,
            aliquota_ir=aliq,
            valor_liquido=valor_liq,
            ir_isento=ir_isento,
            indexador=idx,
        )]

    # ── Semestral ─────────────────────────────────────────────────────────

    def _gerar_semestral(
        self,
        detalhes: DetalhesRendaFixa,
        posicao: float,
        conta: str,
        nome: str,
        idx: IndexadorProjecao,
        premissas: PremissasMercado,
        data_base: date,
        anos: list[int],
        venc: date,
        ir_isento: bool,
        data_aplica: date | None,
    ) -> list[FluxoCaixa]:
        """Gera cupons semestrais + amortização final."""
        fluxos: list[FluxoCaixa] = []
        ano_max = max(anos)

        for yr in sorted(anos):
            if venc and yr > venc.year:
                break
            for mes in detalhes.pmt_meses:
                try:
                    pmt_date = date(yr, mes, 15)
                except ValueError:
                    continue

                if pmt_date <= data_base:
                    continue
                if venc and pmt_date > venc:
                    break

                eh_vencimento = (venc and pmt_date.month == venc.month
                                 and pmt_date.year == venc.year)

                # Valor do cupom
                cupom = self._calcular_cupom(posicao, detalhes, premissas, yr)
                aliq, valor_ir = self._ir.calcular_ir_cupom(
                    cupom, data_aplica, pmt_date, ir_isento,
                )
                fluxos.append(FluxoCaixa(
                    id=__import__("uuid").uuid4(),
                    ativo_nome=nome,
                    conta=conta,
                    data=pmt_date,
                    evento=TipoEventoCaixa.JUROS,
                    valor_bruto=cupom,
                    aliquota_ir=aliq,
                    valor_liquido=cupom - valor_ir,
                    ir_isento=ir_isento,
                    indexador=idx,
                ))

                # Na data de vencimento: adicionar principal separado
                if eh_vencimento:
                    val_final = self._projetar_valor(
                        posicao, detalhes, premissas, data_base, venc.year,
                    )
                    pr_bruto = max(0.0, val_final - cupom)
                    aliq_pr, ir_pr = self._ir.calcular_ir_vencimento(
                        pr_bruto, posicao, data_aplica, venc, ir_isento,
                    )
                    fluxos.append(FluxoCaixa(
                        id=__import__("uuid").uuid4(),
                        ativo_nome=nome + " [PRINCIPAL]",
                        conta=conta,
                        data=venc,
                        evento=TipoEventoCaixa.AMORTIZACAO_FINAL,
                        valor_bruto=pr_bruto,
                        aliquota_ir=aliq_pr,
                        valor_liquido=pr_bruto - ir_pr,
                        ir_isento=ir_isento,
                        indexador=idx,
                    ))
                    break  # encerra ciclo de anos após vencimento

        return fluxos

    # ── Helpers ───────────────────────────────────────────────────────────

    def _calcular_cupom(
        self,
        posicao: float,
        detalhes: DetalhesRendaFixa,
        premissas: PremissasMercado,
        ano: int,
    ) -> float:
        """Calcula o valor do cupom semestral para um ano específico."""
        if detalhes.ntnb_coupon_flag:
            # NTN-B: 6% real a.a. = 2.9563% por semestre sobre o saldo
            return posicao * self._NTNB_COUPON

        prem = premissas.para_ano(ano)
        taxa = detalhes.taxa

        if detalhes.indexador.eh_inflacao:
            # IPCA+spread: cupom ≈ (IPCA/2 + taxa/200) × posicao
            semi = prem.ipca_decimal / 2 + taxa / 200
            return posicao * semi

        if detalhes.indexador.eh_prefixado:
            # Pré-fixado: taxa/200 × posicao (semestral)
            return posicao * taxa / 200

        # Fallback genérico
        return posicao * 0.03

    def _projetar_valor(
        self,
        posicao: float,
        detalhes: DetalhesRendaFixa,
        premissas: PremissasMercado,
        data_base: date,
        ano_alvo: int,
    ) -> float:
        """Projeção simples do valor do título até o ano-alvo.

        Importação local para evitar dependência circular com ProjetorPatrimonio.
        """
        from src.domain.services.projetor_patrimonio import ProjetorPatrimonio
        from src.domain.value_objects.indexador_projecao import IndexadorProjecao

        idx = IndexadorProjecao.from_indexador_rf(detalhes.indexador)
        projetor = ProjetorPatrimonio()
        return projetor.projetar_ativo(
            posicao=posicao,
            indexador=idx,
            taxa=detalhes.taxa,
            vencimento=detalhes.data_vencimento,
            face=None,
            preco_unitario=None,
            premissas=premissas,
            data_base=data_base,
            ano_alvo=ano_alvo,
        )
