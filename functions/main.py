"""
Firebase Function v2 — Parser Python de Notas Sinacor.

Usa correpy para parsear PDFs que o parser browser (pdfjs-dist) não consegue
processar (PDFs-imagem ou baixa qualidade de extração).

Retorna o mesmo contrato ParsedNotaResult do TypeScript — valores em REAIS (float),
não em centavos. A conversão para centavos ocorre em firestore.ts no frontend.

Deploy:
  firebase deploy --only functions

Pré-requisito: plano Blaze (Cloud Functions requer billing ativo).

Chamada no frontend:
  const fn = httpsCallable(functions, 'parse_sinacor_nota');
  const { data } = await fn({ pdfBase64: '<base64>', password: '123' });
"""

import base64
import io
import traceback
from decimal import Decimal
from datetime import date
from typing import Any

import firebase_admin
from firebase_functions import https_fn, options

try:
    from correpy.parsers.brokerage_notes.b3_parser import B3Parser  # type: ignore
    CORREPY_DISPONIVEL = True
except ImportError:
    CORREPY_DISPONIVEL = False

firebase_admin.initialize_app()

# ─── Constantes ───────────────────────────────────────────────────────────────

MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MB

CORRETORAS_NOME: dict[str, str] = {
    "02.332.886/0001-04": "XP Investimentos",
    "61.855.045/0001-32": "XP Investimentos CCTVM",
    "02.038.232/0001-64": "Clear Corretora",
    "00.329.598/0001-44": "Rico Investimentos",
    "62.285.390/0001-40": "Itaú Corretora",
    "07.207.996/0001-50": "BTG Pactual Corretora",
    "43.815.158/0001-22": "Nu Invest Corretora",
    "92.894.922/0001-08": "Genial Investimentos",
}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _reais(valor: Any) -> float:
    """Converte Decimal/None para float em reais."""
    if valor is None:
        return 0.0
    if isinstance(valor, Decimal):
        return float(valor)
    return float(valor)


def _classify_asset(ticker: str, market_type: str) -> str:
    """
    Classifica o ativo. Espelho simplificado de asset-classifier.ts.
    O frontend revalida com as listas de referência estáticas completas.
    """
    t = ticker.upper().strip()
    mt = (market_type or "").upper()

    if any(k in mt for k in ("OPCAO", "OPÇÃO", "OPTION", "CALL", "PUT")):
        return "OPCAO"
    if any(k in mt for k in ("FUTURO", "FUTURE", "TERM")):
        return "FUTURO"

    # BDR por sufixo numérico (34, 35, 32, 33)
    if len(t) >= 5 and t[-2:] in ("34", "35", "32", "33"):
        return "BDR"

    # Sufixo "11" de 6 chars → pode ser FII, ETF ou UNIT
    # Classificação definitiva feita pelo frontend com as listas estáticas
    if t.endswith("11") and len(t) == 6:
        return "FII"  # conservador: frontend reclassifica se for ETF/UNIT

    return "ACAO"


def _format_date(d: Any) -> str:
    """Converte date/datetime/str para 'YYYY-MM-DD'."""
    if d is None:
        return ""
    if isinstance(d, date):
        return d.strftime("%Y-%m-%d")
    s = str(d)[:10]
    return s if len(s) == 10 else ""


# ─── Conversão correpy → ParsedNotaResult ────────────────────────────────────

def _nota_para_parsed_result(nota: Any) -> dict:
    """
    Converte um BrokerageNote do correpy para o formato ParsedNotaResult (TypeScript).
    Valores em REAIS (float), conforme o contrato do schema TypeScript.
    """
    operacoes: list[dict] = []
    vendas_acoes_reais = 0.0

    for tx in (nota.transactions or []):
        # ticker: primeiro token do código de negociação (remove sufixos de espaço)
        ticker = (tx.raw_negotiation_code or "").strip().split()[0].upper()
        action = (tx.action or "").lower()
        tipo = "C" if action in ("buy", "c", "compra") else "V"
        qty = int(tx.quantity or 0)
        preco = _reais(tx.unit_price)
        total = _reais(tx.total_price)
        market = str(tx.market_type or "")
        classe = _classify_asset(ticker, market)

        op = {
            "tipo": tipo,
            "ticker": ticker,
            "classeAtivo": classe,
            "quantidade": qty,
            "precoUnitario": preco,   # reais — nome correto do ParsedNotaResult
            "valorBruto": total,      # reais — nome correto
            "isDayTrade": False,      # detectado depois pelo frontend
            "tipoMercado": market,
        }
        operacoes.append(op)

        if tipo == "V" and classe in ("ACAO", "UNIT"):
            vendas_acoes_reais += total

    # Resumo financeiro — nomes conforme ResumoFinanceiroParsed do TypeScript
    resumo = {
        "taxaOperacional":     _reais(getattr(nota, "brokerage_fee", None)),
        "emolumentos":         _reais(getattr(nota, "settlement_fee", None)),
        "taxaLiquidacao":      _reais(getattr(nota, "settlement_fee", None)),
        "taxaRegistro":        _reais(getattr(nota, "registration_fee", None)),
        "iss":                 _reais(getattr(nota, "iss_tax", None)),
        "irrfNormal":          _reais(getattr(nota, "income_tax", None)),
        "irrfDayTrade":        0.0,
        "liquidoParaCliente":  _reais(getattr(nota, "net_value", None)),
        "totalCustosDedutiveis": (
            _reais(getattr(nota, "brokerage_fee", None)) +
            _reais(getattr(nota, "settlement_fee", None)) +
            _reais(getattr(nota, "registration_fee", None)) +
            _reais(getattr(nota, "iss_tax", None))
        ),
    }

    data_pregao = _format_date(nota.reference_date)
    ano_mes = data_pregao[:7] if len(data_pregao) >= 7 else ""
    cnpj = str(nota.cnpj or "").strip()
    corretora = CORRETORAS_NOME.get(cnpj, str(nota.source_system or ""))

    campos_faltando: list[str] = []
    if not data_pregao:
        campos_faltando.append("dataPregao")
    if not operacoes:
        campos_faltando.append("operacoes")
    if resumo["liquidoParaCliente"] == 0.0:
        campos_faltando.append("resumoFinanceiro")

    return {
        # Metadados da nota — nomes conforme ParsedNotaResult TypeScript
        "nrNota":        str(nota.note_number or ""),
        "dataPregao":    data_pregao,
        "anoMes":        ano_mes,
        "corretora":     corretora,
        "cnpjCorretora": cnpj,
        "segmento":      "BOVESPA",
        "cpfCliente":    str(nota.cpf or ""),
        # Operações
        "operacoes": operacoes,
        # Resumo financeiro
        "resumo": resumo,
        # Metadados do parser — nomes conforme ParserMeta TypeScript
        "parser": {
            "tipo":      "python-correpy",
            "versao":    "correpy-2",
            "timestamp": "",  # preenchido pelo wrapper TS
            "confianca": 0.90,
        },
        # Qualidade e revisão
        "qualidade":      "ALTA" if not campos_faltando else "MEDIA",
        "camposFaltando": campos_faltando,
        "avisos":         [],
        # Campo extra (não faz parte do ParsedNotaResult, mas útil para o modal)
        "_vendasAcoesST": vendas_acoes_reais,
    }


# ─── Cloud Function ───────────────────────────────────────────────────────────

@https_fn.on_call(
    region="southamerica-east1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
)
def parse_sinacor_nota(req: https_fn.CallableRequest) -> dict:
    """
    Parseia uma nota Sinacor com correpy (Python).
    Chamado pelo frontend quando o parser browser retorna IMAGEM ou BAIXA qualidade.

    Input (req.data):
      pdfBase64: str     — PDF codificado em base64
      password?: str     — senha do PDF (primeiros 3 dígitos do CPF)

    Output: ParsedNotaResult compatível com o schema TypeScript (valores em reais)
    """
    # ── Autenticação ─────────────────────────────────────────────────────────
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Autenticação necessária.",
        )

    if not CORREPY_DISPONIVEL:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="correpy não instalado — faça o deploy com requirements.txt atualizado.",
        )

    # ── Validação de entrada ─────────────────────────────────────────────────
    pdf_b64: str = req.data.get("pdfBase64", "")
    password: str | None = req.data.get("password") or None

    if not pdf_b64:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Campo pdfBase64 é obrigatório.",
        )

    try:
        pdf_bytes = base64.b64decode(pdf_b64)
    except Exception:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="pdfBase64 inválido — não é base64 válido.",
        )

    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message=f"PDF excede o limite de {MAX_PDF_BYTES // 1_048_576} MB.",
        )

    # ── Parse com correpy ─────────────────────────────────────────────────────
    try:
        parser = B3Parser(
            brokerage_note=io.BytesIO(pdf_bytes),
            password=password,
        )
        notas = parser.parse_brokerage_note()
    except Exception as exc:
        msg = str(exc).lower()
        if "password" in msg or "senha" in msg or "encrypted" in msg or "decrypt" in msg:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="PDF protegido — senha incorreta ou ausente.",
                details={"code": "WRONG_PASSWORD"},
            )
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Falha ao parsear nota: {exc}",
            details={"traceback": traceback.format_exc()[:2000]},
        )

    if not notas:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Nenhuma nota encontrada no PDF.",
        )

    return _nota_para_parsed_result(notas[0])
