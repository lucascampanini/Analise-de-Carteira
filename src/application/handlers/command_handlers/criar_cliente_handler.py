"""Handler: CriarClienteHandler."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from src.application.commands.criar_cliente import CriarCliente
from src.application.ports.outbound.cliente_repository import ClienteRepository
from src.domain.entities.cliente import Cliente
from src.domain.value_objects.cpf import CPF
from src.domain.value_objects.horizonte_investimento import HorizonteInvestimento
from src.domain.value_objects.objetivo_financeiro import ObjetivoFinanceiro
from src.domain.value_objects.perfil_investidor import PerfilInvestidor


class CriarClienteHandler:
    """Handler para o command CriarCliente.

    Idempotente: se CPF já existir, retorna o ID existente sem criar duplicata.
    """

    def __init__(self, cliente_repository: ClienteRepository) -> None:
        self._repo = cliente_repository

    async def handle(self, command: CriarCliente) -> str:
        """Executa o command CriarCliente.

        Args:
            command: Command com dados do cliente.

        Returns:
            ID do cliente criado ou existente (idempotência por CPF).
        """
        cpf = CPF(command.cpf)

        # Idempotência: retorna existente se CPF já cadastrado
        existing = await self._repo.find_by_cpf(cpf)
        if existing is not None:
            return str(existing.id)

        cliente = Cliente(
            id=uuid4(),
            nome=command.nome,
            cpf=cpf,
            perfil=PerfilInvestidor(command.perfil),
            objetivo=ObjetivoFinanceiro(command.objetivo),
            horizonte=HorizonteInvestimento(command.horizonte),
            tolerancia_perda_percentual=command.tolerancia_perda_percentual,
            criado_em=datetime.now(timezone.utc),
        )

        await self._repo.save(cliente)
        return str(cliente.id)
