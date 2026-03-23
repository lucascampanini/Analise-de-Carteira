"""Hook PostToolUse: avisa quando arquivo financeiro é modificado."""
import os

f = os.environ.get("CLAUDE_TOOL_INPUT_FILE_PATH", "")

financial_patterns = [
    "domain/services",
    "domain/value_objects",
    "handlers/command_handlers",
    "outbound/market_data",
    "outbound/report",
]

if any(p in f for p in financial_patterns):
    print(f"[review-financeiro] ARQUIVO FINANCEIRO MODIFICADO: {f}")
    print("[review-financeiro] Execute /review-financeiro para validar calculos.")
else:
    nome = f if f else "(desconhecido)"
    print(f"[hook] Arquivo modificado: {nome}")
