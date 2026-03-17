"""Jobs diários do Assistente.

Executa todo dia às 08:00 (horário de Brasília):
  1. Verifica eventos para alertar (vencimentos, aniversários, etc.)
  2. Gera relatórios de carteira para reuniões do dia
  3. Alerta sobre liquidações pendentes (D+1/D+2/D+3)
"""

from __future__ import annotations

import shutil
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.assistente.adapters.outbound.messaging.evolution_whatsapp_adapter import (
    EvolutionWhatsAppAdapter,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.evento_repository import (
    SqlAlchemyEventoRepository,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.reuniao_repository import (
    SqlAlchemyReuniaoRepository,
)
from src.assistente.adapters.outbound.persistence.sqlalchemy.cliente_assessor_repository import (
    SqlAlchemyClienteAssessorRepository,
)
from src.assistente.domain.entities.evento import Evento, TipoEvento
from src.assistente.models.assistente_models import AssEventoModel, AssLembreteEnviadoModel
from src.config.settings import Settings

logger = structlog.get_logger(__name__)


class AssistenteDailyJobs:
    """Agendador de tarefas diárias do assistente."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        settings: Settings,
    ) -> None:
        self._session_factory = session_factory
        self._settings = settings
        self._whatsapp = (
            EvolutionWhatsAppAdapter(
                api_url=settings.evolution_api_url,
                api_key=settings.evolution_api_key,
                instance_name=settings.evolution_instance_name,
            )
            if settings.evolution_api_url
            else None
        )

    async def executar_rotina_matinal(self) -> None:
        """Rotina principal — executa todo dia às 08:00."""
        logger.info("rotina_matinal_iniciada", data=str(date.today()))
        async with self._session_factory() as session:
            async with session.begin():
                await self._gerar_alertas_aniversario(session)
                await self._alertar_eventos(session)
                await self._alertar_reunioes_do_dia(session)
        logger.info("rotina_matinal_concluida")

    async def _gerar_alertas_aniversario(self, session: AsyncSession) -> None:
        """Gera eventos de aniversário para clientes com birthday nos próximos 30 dias.

        Roda diariamente — idempotente: só cria se não existir evento ativo para
        o mesmo cliente no mesmo ano.
        """
        from sqlalchemy import select, and_, extract
        hoje = date.today()
        ano = hoje.year
        limite = hoje + timedelta(days=30)

        cliente_repo = SqlAlchemyClienteAssessorRepository(session)
        clientes = await cliente_repo.listar_todos()

        criados = 0
        for c in clientes:
            if not c.data_nascimento:
                continue

            # Calcular próximo aniversário
            try:
                aniv = c.data_nascimento.replace(year=ano)
            except ValueError:
                # 29/fev em ano não bissexto
                aniv = date(ano, 3, 1)

            # Se já passou este ano, usa o próximo
            if aniv < hoje:
                try:
                    aniv = c.data_nascimento.replace(year=ano + 1)
                except ValueError:
                    aniv = date(ano + 1, 3, 1)

            if aniv > limite:
                continue

            # Verificar se já existe evento ANIVERSARIO ativo para este cliente este ano
            stmt = select(AssEventoModel).where(
                and_(
                    AssEventoModel.codigo_conta == c.codigo_conta,
                    AssEventoModel.tipo == TipoEvento.ANIVERSARIO.value,
                    AssEventoModel.status == "ATIVO",
                    extract("year", AssEventoModel.data_evento) == aniv.year,
                )
            )
            existente = (await session.execute(stmt)).scalars().first()
            if existente:
                continue

            idade = aniv.year - c.data_nascimento.year
            evento = Evento(
                id=str(uuid.uuid4()),
                tipo=TipoEvento.ANIVERSARIO,
                descricao=f"🎂 Aniversário de {c.nome} ({idade} anos)",
                data_evento=aniv,
                alertar_dias_antes=3,
                codigo_conta=c.codigo_conta,
                nome_cliente=c.nome,
            )
            evento_model = AssEventoModel(
                id=evento.id,
                tipo=evento.tipo.value,
                descricao=evento.descricao,
                data_evento=evento.data_evento,
                alertar_dias_antes=evento.alertar_dias_antes,
                status=evento.status.value,
                codigo_conta=evento.codigo_conta,
                nome_cliente=evento.nome_cliente,
                criado_em=evento.criado_em,
            )
            session.add(evento_model)
            criados += 1

        logger.info("alertas_aniversario_gerados", criados=criados)

    async def _alertar_eventos(self, session: AsyncSession) -> None:
        """Envia alertas de eventos para hoje."""
        repo = SqlAlchemyEventoRepository(session)
        hoje = date.today()
        eventos = await repo.listar_para_alertar(hoje)

        if not eventos:
            logger.info("sem_eventos_para_alertar", data=str(hoje))
            return

        mensagens = []
        for evento in eventos:
            dias = evento.dias_para_evento(hoje)
            prefixo = "📅 *HOJE*" if dias == 0 else f"⏰ Em {dias} dia(s)"
            cliente_info = f" — {evento.nome_cliente}" if evento.nome_cliente else ""
            mensagens.append(f"{prefixo}: {evento.descricao}{cliente_info}")

            # Registrar lembrete enviado
            lembrete = AssLembreteEnviadoModel(
                id=str(uuid.uuid4()),
                evento_id=evento.id,
                mensagem=f"{prefixo}: {evento.descricao}",
            )
            session.add(lembrete)
            await repo.marcar_alertado(evento.id)

        texto = "🤖 *Assistente — Alertas do dia*\n\n" + "\n".join(mensagens)
        await self._enviar_whatsapp(texto)

    async def _alertar_reunioes_do_dia(self, session: AsyncSession) -> None:
        """Avisa sobre reuniões agendadas para hoje."""
        repo = SqlAlchemyReuniaoRepository(session)
        hoje = date.today()
        reunioes = await repo.listar_do_dia(hoje)

        if not reunioes:
            return

        linhas = []
        for r in reunioes:
            horario = r.data_hora.strftime("%H:%M")
            cliente_info = f" com {r.nome_cliente}" if r.nome_cliente else ""
            relatorio_info = " 📊 (relatório será gerado)" if r.gerar_relatorio else ""
            linhas.append(f"• {horario}{cliente_info} — {r.titulo}{relatorio_info}")

        texto = "📆 *Reuniões de hoje:*\n" + "\n".join(linhas)
        await self._enviar_whatsapp(texto)

    async def fazer_backup_banco(self) -> None:
        """Copia o banco SQLite para a pasta backups/ com timestamp. Mantém os últimos 30."""
        db_path = Path("analise_carteira.db")
        if not db_path.exists():
            logger.info("backup_ignorado", motivo="banco SQLite não encontrado")
            return

        backup_dir = Path("backups")
        backup_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
        destino = backup_dir / f"analise_carteira_{timestamp}.db"
        shutil.copy2(db_path, destino)
        logger.info("backup_realizado", arquivo=str(destino))

        # Manter apenas os últimos 30 backups
        backups = sorted(backup_dir.glob("analise_carteira_*.db"))
        for antigo in backups[:-30]:
            antigo.unlink()
            logger.info("backup_removido", arquivo=str(antigo))

    async def _enviar_whatsapp(self, mensagem: str) -> None:
        if self._whatsapp is None or not self._settings.whatsapp_numero_assessor:
            logger.warning("whatsapp_nao_configurado", motivo="evolution_api_url ou numero vazio")
            return
        await self._whatsapp.enviar_mensagem(
            numero=self._settings.whatsapp_numero_assessor,
            mensagem=mensagem,
        )


def registrar_jobs(
    scheduler,  # APScheduler AsyncIOScheduler
    session_factory: async_sessionmaker[AsyncSession],
    settings: Settings,
) -> None:
    """Registra os jobs no APScheduler. Chamado no lifespan do FastAPI."""
    jobs = AssistenteDailyJobs(session_factory=session_factory, settings=settings)

    # Todo dia às 08:00 horário de Brasília
    scheduler.add_job(
        jobs.executar_rotina_matinal,
        trigger="cron",
        hour=8,
        minute=0,
        timezone="America/Sao_Paulo",
        id="rotina_matinal_assistente",
        replace_existing=True,
    )

    # Backup do banco todo dia às 23:50
    scheduler.add_job(
        jobs.fazer_backup_banco,
        trigger="cron",
        hour=23,
        minute=50,
        timezone="America/Sao_Paulo",
        id="backup_banco_diario",
        replace_existing=True,
    )

    logger.info("jobs_assistente_registrados")
