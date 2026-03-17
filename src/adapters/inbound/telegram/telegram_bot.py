"""Adapter inbound: Bot Telegram para o Assessor Bot.

Fluxo de mensagens:
  - Texto → Claude com tool use (ChatHandler)
  - PDF   → ProcessarExtratoHandler diretamente (após confirmar cliente_id + data)
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import async_sessionmaker
from telegram import BotCommand, Document, Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from src.adapters.outbound.llm.claude_chat_adapter import ClaudeChatAdapter
from src.application.commands.processar_extrato import ProcessarExtrato
from src.config.settings import Settings

logger = structlog.get_logger(__name__)

# Máximo de mensagens mantidas no histórico por chat (10 turnos = 20 msgs)
_MAX_HISTORY = 20

# Limite de caracteres por mensagem no Telegram
_TELEGRAM_MAX_CHARS = 4096


class TelegramBotAdapter:
    """Adapter inbound: recebe atualizações do Telegram e delega ao domínio."""

    def __init__(
        self,
        token: str,
        session_factory: async_sessionmaker,  # type: ignore[type-arg]
        settings: Settings,
    ) -> None:
        self._token = token
        self._session_factory = session_factory
        self._settings = settings

        # Histórico de conversa por chat_id: list de mensagens Anthropic
        self._histories: dict[int, list[dict[str, Any]]] = {}

        # PDFs pendentes aguardando cliente_id + data_referencia
        # chat_id → (pdf_bytes, filename)
        self._pending_pdfs: dict[int, tuple[bytes, str]] = {}

        self._app: Application | None = None  # type: ignore[type-arg]

    # ------------------------------------------------------------------
    # Lifecycle (chamado pelo FastAPI lifespan)
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Inicializa o bot e começa o polling."""
        self._app = self._build_application()
        await self._app.initialize()
        await self._app.start()
        await self._app.updater.start_polling(drop_pending_updates=True)  # type: ignore[union-attr]
        await self._app.bot.set_my_commands(
            [
                BotCommand("start", "Iniciar / reiniciar conversa"),
                BotCommand("limpar", "Limpar histórico da conversa"),
                BotCommand("ajuda", "Mostrar instruções de uso"),
            ]
        )
        logger.info("telegram_bot_started")

    async def stop(self) -> None:
        """Para o bot graciosamente."""
        if self._app is None:
            return
        await self._app.updater.stop()  # type: ignore[union-attr]
        await self._app.stop()
        await self._app.shutdown()
        logger.info("telegram_bot_stopped")

    # ------------------------------------------------------------------
    # Registro de handlers
    # ------------------------------------------------------------------

    def _build_application(self) -> Application:  # type: ignore[type-arg]
        app = Application.builder().token(self._token).build()
        app.add_handler(CommandHandler("start", self._cmd_start))
        app.add_handler(CommandHandler("limpar", self._cmd_limpar))
        app.add_handler(CommandHandler("ajuda", self._cmd_ajuda))
        app.add_handler(MessageHandler(filters.Document.PDF, self._handle_pdf))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_text))
        return app

    # ------------------------------------------------------------------
    # Comandos
    # ------------------------------------------------------------------

    async def _cmd_start(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        if update.effective_chat is None or update.message is None:
            return
        chat_id = update.effective_chat.id
        self._histories.pop(chat_id, None)
        self._pending_pdfs.pop(chat_id, None)
        await update.message.reply_text(
            "Olá! Sou o *Assessor Bot*, seu assistente para análise de carteiras de "
            "investimento.\n\n"
            "Posso ajudá-lo a:\n"
            "• Cadastrar novos clientes\n"
            "• Processar extratos de carteira — envie o PDF direto aqui\n"
            "• Consultar análises e recomendações de rebalanceamento\n\n"
            "Como posso ajudá-lo hoje?",
            parse_mode=ParseMode.MARKDOWN,
        )

    async def _cmd_limpar(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        if update.effective_chat is None or update.message is None:
            return
        chat_id = update.effective_chat.id
        self._histories.pop(chat_id, None)
        self._pending_pdfs.pop(chat_id, None)
        await update.message.reply_text("Histórico limpo. Pode começar uma nova conversa.")

    async def _cmd_ajuda(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        if update.message is None:
            return
        await update.message.reply_text(
            "*Como usar o Assessor Bot*\n\n"
            "*Cadastrar cliente:*\n"
            "Diga: _\"Cadastre o cliente João Silva, CPF 123.456.789-00, "
            "perfil moderado, objetivo aposentadoria, horizonte longo prazo, "
            "tolerância a perda de 20%\"_\n\n"
            "*Processar extrato:*\n"
            "Envie o PDF do extrato diretamente no chat. O bot solicitará o ID do "
            "cliente e a data de referência.\n\n"
            "*Consultar análise:*\n"
            "Diga: _\"Mostre a análise <id_da_analise>\"_\n\n"
            "*Comandos:*\n"
            "/start — reiniciar conversa\n"
            "/limpar — limpar histórico\n"
            "/ajuda — esta mensagem",
            parse_mode=ParseMode.MARKDOWN,
        )

    # ------------------------------------------------------------------
    # Handler de PDF
    # ------------------------------------------------------------------

    async def _handle_pdf(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        if update.effective_chat is None or update.message is None:
            return
        chat_id = update.effective_chat.id
        doc: Document | None = update.message.document
        if doc is None:
            return

        await update.message.reply_text("PDF recebido. Baixando...")

        try:
            file = await context.bot.get_file(doc.file_id)
            pdf_bytes = bytes(await file.download_as_bytearray())
        except Exception as exc:
            await update.message.reply_text(f"Erro ao baixar o arquivo: {exc}")
            return

        self._pending_pdfs[chat_id] = (pdf_bytes, doc.file_name or "extrato.pdf")

        await update.message.reply_text(
            "PDF recebido com sucesso!\n\n"
            "Por favor, informe na próxima mensagem:\n"
            "`<cliente_id> <data_referencia>`\n\n"
            "Exemplo:\n"
            "`3f7a1b2c-... 2025-01-31`",
            parse_mode=ParseMode.MARKDOWN,
        )

    # ------------------------------------------------------------------
    # Handler de texto
    # ------------------------------------------------------------------

    async def _handle_text(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        if update.effective_chat is None or update.message is None or update.message.text is None:
            return

        chat_id = update.effective_chat.id
        text = update.message.text.strip()

        # Se há PDF pendente, interpreta o texto como cliente_id + data
        if chat_id in self._pending_pdfs:
            await self._process_pdf_with_info(update, text)
            return

        await self._process_with_claude(update, text)

    # ------------------------------------------------------------------
    # Fluxo PDF
    # ------------------------------------------------------------------

    async def _process_pdf_with_info(self, update: Update, text: str) -> None:
        if update.effective_chat is None or update.message is None:
            return

        chat_id = update.effective_chat.id
        parts = text.split()

        if len(parts) < 2:
            await update.message.reply_text(
                "Por favor, informe no formato: `<cliente_id> <data_referencia>`\n"
                "Exemplo: `3f7a1b2c-... 2025-01-31`",
                parse_mode=ParseMode.MARKDOWN,
            )
            return

        cliente_id, data_referencia = parts[0], parts[1]
        pdf_bytes, filename = self._pending_pdfs[chat_id]

        await update.message.reply_text("Processando extrato e gerando análise...")

        try:
            async with self._session_factory() as session:
                async with session.begin():
                    from src.config.container import Container

                    container = Container(settings=self._settings, session=session)
                    command = ProcessarExtrato(
                        cliente_id=cliente_id,
                        pdf_bytes=pdf_bytes,
                        nome_arquivo=filename,
                        data_referencia=data_referencia,
                        idempotency_key=str(uuid.uuid4()),
                    )
                    analise_id = await container.processar_extrato_handler.handle(command)

            del self._pending_pdfs[chat_id]

            await update.message.reply_text(
                "Extrato processado com sucesso!\n\n"
                f"*ID da Análise:* `{analise_id}`\n\n"
                "Para ver os resultados, envie:\n"
                f'_"Mostre a análise {analise_id}"_',
                parse_mode=ParseMode.MARKDOWN,
            )
        except Exception as exc:
            logger.exception("telegram_pdf_processing_error", error=str(exc))
            await update.message.reply_text(
                f"Erro ao processar o extrato: {exc}\n\n"
                "Verifique se o ID do cliente e a data estão corretos e tente novamente."
            )

    # ------------------------------------------------------------------
    # Fluxo texto → Claude
    # ------------------------------------------------------------------

    async def _process_with_claude(self, update: Update, text: str) -> None:
        if update.effective_chat is None or update.message is None:
            return

        if not self._settings.anthropic_api_key:
            await update.message.reply_text(
                "A chave da API Anthropic (Claude) ainda não está configurada.\n\n"
                "Adicione BOT_ANTHROPIC_API_KEY no arquivo .env e reinicie o servidor.\n"
                "Acesse https://console.anthropic.com para obter sua chave."
            )
            return

        chat_id = update.effective_chat.id
        history = self._histories.get(chat_id, [])

        try:
            async with self._session_factory() as session:
                async with session.begin():
                    from src.config.container import Container

                    container = Container(settings=self._settings, session=session)
                    response_text, updated_history = await container.chat_handler.handle(
                        user_message=text,
                        conversation_history=history,
                    )

            # Mantém apenas as últimas N mensagens para evitar crescimento ilimitado
            self._histories[chat_id] = updated_history[-_MAX_HISTORY:]

            await self._send_long_message(update, response_text)

        except Exception as exc:
            logger.exception("telegram_claude_error", error=str(exc))
            await update.message.reply_text(  # type: ignore[union-attr]
                f"Erro interno ao processar sua mensagem: {exc}\n"
                "Tente novamente ou use /limpar para reiniciar a conversa."
            )

    # ------------------------------------------------------------------
    # Helper: envio de mensagens longas
    # ------------------------------------------------------------------

    @staticmethod
    async def _send_long_message(update: Update, text: str) -> None:
        """Envia texto dividindo em partes se ultrapassar o limite do Telegram."""
        if update.message is None:
            return

        if len(text) <= _TELEGRAM_MAX_CHARS:
            await update.message.reply_text(text)
            return

        # Divide em partes sem quebrar no meio de uma palavra
        parts: list[str] = []
        while len(text) > _TELEGRAM_MAX_CHARS:
            split_at = text.rfind("\n", 0, _TELEGRAM_MAX_CHARS)
            if split_at == -1:
                split_at = _TELEGRAM_MAX_CHARS
            parts.append(text[:split_at])
            text = text[split_at:].lstrip("\n")
        if text:
            parts.append(text)

        for part in parts:
            await update.message.reply_text(part)
