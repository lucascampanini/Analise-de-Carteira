"""ORM Models do Assistente Pessoal.

Todas as tabelas usam prefixo ass_ para fácil identificação e remoção.
Para remover o módulo: deletar src/assistente/ e reverter app_factory.py.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.adapters.outbound.persistence.sqlalchemy.models.orm_models import Base


class AssClienteModel(Base):
    """Clientes do assessor importados das planilhas XP.

    Cruza dados do RelatorioSaldoConsolidado (nome, saldo D+x)
    com o Positivador (profissão, nascimento, suitability, net).
    """

    __tablename__ = "ass_clientes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    profissao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_cadastro: Mapped[date | None] = mapped_column(Date, nullable=True)
    net: Mapped[float | None] = mapped_column(Float, nullable=True)  # VAL_NET_EM_M
    suitability: Mapped[str | None] = mapped_column(String(50), nullable=True)
    segmento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Saldos de liquidação (do RelatorioSaldoConsolidado)
    saldo_d0: Mapped[float | None] = mapped_column(Float, nullable=True)
    saldo_d1: Mapped[float | None] = mapped_column(Float, nullable=True)
    saldo_d2: Mapped[float | None] = mapped_column(Float, nullable=True)
    saldo_d3: Mapped[float | None] = mapped_column(Float, nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AssEventoModel(Base):
    """Datas importantes monitoradas pelo assistente.

    Inclui vencimentos de RF, aniversários, janelas de resgate, etc.
    O scheduler verifica diariamente e envia alertas com antecedência.
    """

    __tablename__ = "ass_eventos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Tipo: VENCIMENTO_RF | ANIVERSARIO | JANELA_RESGATE | RESGATE_FUNDO | LIQUIDACAO | OUTROS
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    codigo_conta: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    descricao: Mapped[str] = mapped_column(String(500), nullable=False)
    data_evento: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    alertar_dias_antes: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Status: ATIVO | ALERTADO | CONCLUIDO | CANCELADO
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ATIVO", index=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssReuniaoModel(Base):
    """Reuniões agendadas com clientes.

    Integradas com Outlook via Microsoft Graph API.
    Reuniões de review de carteira disparam geração automática de relatório.
    """

    __tablename__ = "ass_reunioes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duracao_minutos: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    outlook_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Se True, gera relatório PDF/XLSX de carteira na manhã do dia
    gerar_relatorio: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    relatorio_gerado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Status: AGENDADA | REALIZADA | CANCELADA
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="AGENDADA")
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssRendaFixaModel(Base):
    """Posições de renda fixa com datas de vencimento.

    Importado da planilha de aplicações RF.
    Alimenta automaticamente a tabela ass_eventos com alertas de vencimento.
    """

    __tablename__ = "ass_renda_fixa"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Tipo: CDB | LCI | LCA | LTN | NTN-B | NTN-F | CRI | CRA | DEBENTURE | OUTRO
    tipo_ativo: Mapped[str] = mapped_column(String(30), nullable=False)
    dsc_ativo: Mapped[str | None] = mapped_column(String(255), nullable=True)   # nome original XP
    emissor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    indexador: Mapped[str | None] = mapped_column(String(30), nullable=True)  # CDI | IPCA | PRE
    percentual_indexador: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_compra: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    valor_aplicado: Mapped[float | None] = mapped_column(Float, nullable=True)
    evento_criado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    importado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssPosicaoRVModel(Base):
    """Posições de Renda Variável: ações, FIIs, opções, aluguel de ações.

    Importado do Diversificador XP.
    """

    __tablename__ = "ass_posicoes_rv"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # ACAO | FII | OPCAO | ALUGUEL
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    ticker: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    dsc_ativo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emissor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quantidade: Mapped[float | None] = mapped_column(Float, nullable=True)
    valor_net: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_vencimento: Mapped[date | None] = mapped_column(Date, nullable=True)  # opções
    data_referencia: Mapped[date | None] = mapped_column(Date, nullable=True)
    importado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssPosicaoFundoModel(Base):
    """Posições em Fundos de Investimento.

    Importado do Diversificador XP. Inclui fundos RF, multimercado, ações, FIP.
    """

    __tablename__ = "ass_posicoes_fundos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # RF | MULTIMERCADO | ACOES | FIP | OUTROS
    tipo_fundo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    cnpj_fundo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    nome_fundo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gestora: Mapped[str | None] = mapped_column(String(255), nullable=True)
    valor_net: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_referencia: Mapped[date | None] = mapped_column(Date, nullable=True)
    importado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssPosicaoPrevModel(Base):
    """Posições em Previdência Privada (PGBL/VGBL).

    Importado do Diversificador XP.
    """

    __tablename__ = "ass_posicoes_prev"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # MULTIMERCADO | RF | ACOES | OUTROS
    tipo_fundo: Mapped[str] = mapped_column(String(20), nullable=False)
    nome_fundo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gestora: Mapped[str | None] = mapped_column(String(255), nullable=True)
    valor_net: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_referencia: Mapped[date | None] = mapped_column(Date, nullable=True)
    importado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssLeadModel(Base):
    """Leads no funil de prospecção do assessor."""

    __tablename__ = "ass_leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # INDICACAO | EVENTO | LINKEDIN | COLD_CALL | OUTRO
    origem: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # PROSPECTO | CONTATO | PROPOSTA | CLIENTE
    estagio: Mapped[str] = mapped_column(String(20), nullable=False, default="PROSPECTO", index=True)
    valor_potencial: Mapped[float | None] = mapped_column(Float, nullable=True)
    anotacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    proximo_passo: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_proximo_contato: Mapped[date | None] = mapped_column(Date, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AssAnotacaoModel(Base):
    """Anotações e timeline de contatos com clientes."""

    __tablename__ = "ass_anotacoes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_conta: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # LIGACAO | REUNIAO | EMAIL | WHATSAPP | NOTA
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class AssAlertaPrecoModel(Base):
    """Alertas de preço para ações e FIIs."""

    __tablename__ = "ass_alertas_preco"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    codigo_conta: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # COMPRA | VENDA | STOP
    tipo_alerta: Mapped[str] = mapped_column(String(10), nullable=False)
    preco_alvo: Mapped[float] = mapped_column(Float, nullable=False)
    premissa: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    disparado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    preco_disparado: Mapped[float | None] = mapped_column(Float, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class AssLembreteEnviadoModel(Base):
    """Controle de lembretes já enviados via WhatsApp.

    Evita duplicidade: o scheduler verifica esta tabela antes de enviar.
    """

    __tablename__ = "ass_lembretes_enviados"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    evento_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    enviado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    mensagem: Mapped[str | None] = mapped_column(Text, nullable=True)


class AssOfertaMensalModel(Base):
    """Oferta mensal criada pelo assessor (ex: DI-2029, NTN-B 35, Euro Garden)."""

    __tablename__ = "ass_ofertas_mensais"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_liquidacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    roa: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # % ex: 0.5
    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AssClienteOfertaModel(Base):
    """Participação de um cliente em uma oferta mensal."""

    __tablename__ = "ass_clientes_oferta"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    oferta_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    codigo_conta: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    nome_cliente: Mapped[str | None] = mapped_column(String(200), nullable=True)
    net: Mapped[float | None] = mapped_column(Float, nullable=True)
    saldo_disponivel: Mapped[float | None] = mapped_column(Float, nullable=True)
    valor_ofertado: Mapped[float | None] = mapped_column(Float, nullable=True)
    # PENDENTE | RESERVADO | PUSH_ENVIADO | FINALIZADO
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDENTE")
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AssFundoCVMModel(Base):
    """Cadastro de fundos com prazos de resgate.

    Alimentado via importação da planilha XP (lista-fundos-*.xlsx).
    CNPJ armazenado somente com dígitos para facilitar lookup.
    """

    __tablename__ = "ass_fundos_cvm"

    cnpj: Mapped[str] = mapped_column(String(14), primary_key=True)  # só dígitos
    denom_social: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gestora: Mapped[str | None] = mapped_column(String(255), nullable=True)
    situacao: Mapped[str | None] = mapped_column(String(50), nullable=True)
    prazo_cotiz_resg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tipo_dia_cotiz: Mapped[str | None] = mapped_column(String(20), nullable=True)  # DU | DC
    prazo_pagto_resg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tipo_dia_pagto: Mapped[str | None] = mapped_column(String(20), nullable=True)  # DU | DC
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AssHistoricoImportModel(Base):
    """Histórico dos últimos imports do Diversificador.

    Mantém os últimos 3 registros por tipo para rastrear o que foi importado.
    """

    __tablename__ = "ass_historico_imports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # RF | COMPLETO
    data_referencia: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_rf: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_rv: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_fundos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_prev: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_clientes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    importado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
