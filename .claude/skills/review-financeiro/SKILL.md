---
name: review-financeiro
description: Revisa cálculos financeiros — projeções RF, IR, reinvestimento, fluxo de caixa, premissas de mercado. Detecta double-counting, falsy-float, frações de data erradas, API sem fallback robusto e convenções de indexadores. Use após modificar qualquer service, value_object ou handler do domínio financeiro.
argument-hint: [arquivo-ou-diretório]
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Agente de Revisão: Cálculos Financeiros

Você é um revisor especialista em cálculos de renda fixa, projeção de patrimônio e tributação no mercado brasileiro.
Revise o código em `$ARGUMENTS` com foco em **corretude matemática e financeira**.

Se `$ARGUMENTS` estiver vazio, revise todos os arquivos em:
- `src/domain/services/`
- `src/domain/value_objects/`
- `src/application/handlers/command_handlers/`
- `src/adapters/outbound/market_data/`
- `src/adapters/outbound/report/`

---

## CHECKLIST OBRIGATÓRIO

### 1. Padrão Falsy-Float (BUG DE ALTO IMPACTO)

Nunca use `taxa or 0.0` ou `valor or default` para floats financeiros.
`0.0 or default` retorna `default` — um ativo com taxa 0% seria tratado como sem taxa.

**Padrão errado:**
```python
taxa_efetiva = taxa or 0.0
posicao = posicao or 100.0
```

**Padrão correto:**
```python
taxa_efetiva = taxa if taxa is not None else 0.0
posicao = posicao if posicao is not None else 100.0
```

Procure por: `or 0`, `or 0.0`, `or 1.0`, `or []`, `or {}` em contextos de variáveis financeiras numéricas.

Verifique também valores default em funções:
```python
# Errado — taxa=0 seria ignorado
def calcular(taxa=None):
    t = taxa or 100.0  # BUG: taxa=0.0 vira 100.0

# Correto
def calcular(taxa=None):
    t = taxa if taxa is not None else 100.0
```

---

### 2. Fração de Ano em Projeções (BUG DE PRECISÃO)

Projeções de patrimônio devem usar `data_base` como início do período no primeiro ano,
não `date(ano, 1, 1)`. Usar Jan/1 como início quando estamos em Março supõe 2 meses extras de retorno.

**Padrão errado:**
```python
def _fracao_ano(self, yr, vencimento, ...):
    if vencimento and vencimento.year == yr:
        inicio = date(yr, 1, 1)  # BUG: ignora que já estamos em Março
        return (vencimento - inicio).days / 365.0
    return 1.0  # BUG: retorna ano cheio mesmo em 2026 a partir de Março
```

**Padrão correto:**
```python
def _fracao_ano(self, yr, vencimento, data_base, ano_alvo):
    inicio = max(date(yr, 1, 1), data_base) if yr == data_base.year else date(yr, 1, 1)
    if vencimento and vencimento.year == yr:
        return max(0.0, (vencimento - inicio).days / 365.0)
    if yr == data_base.year:
        return max(0.0, (date(yr, 12, 31) - inicio).days / 365.0)
    return 1.0
```

Cheque: toda função que calcula `dias / 365` ou `dias / 252` — está considerando `data_base`?

---

### 3. Double-Counting em Acumuladores (BUG LÓGICO GRAVE)

Quando um sistema tem duas fontes de valor para o mesmo ativo no mesmo período
(ex: `projetar_ativo` + `projetar_reinvestimento`), verificar que cada evento
é contado exatamente UMA vez.

**Sintoma clássico:** patrimônio desce de 2026 para 2027 mesmo sem saques.

**Padrão a procurar:**
```python
# Projetor conta o ativo que vence em 2026
tot += self._projetor.projetar_ativo(posicao=ativo.posicao, ...)

# Reinvestimento TAMBÉM conta o CF de 2026 → double-count!
reinvest = self._projetor.projetar_reinvestimento(cf_por_ano, ..., ano_alvo=2026)
tot += reinvest
```

**Padrão correto:** reinvest deve acumular apenas CFs de anos **anteriores** ao alvo:
```python
# Em projetar_reinvestimento: para ano_alvo=2026, não inclui cf_2026
# (bonds maturing in 2026 already counted in projetar_ativo)
running *= (1 + cdi_r)
if yr < ano_alvo:          # ← só anos anteriores
    running += fluxos_por_ano.get(yr, 0.0)
```

Regra geral: se um loop de anos tem `if yr > ano_alvo: break` e soma `fluxos[yr]`
incluindo `yr == ano_alvo`, investigue se há outra fonte que já conta esse ano.

---

### 4. Ativos Já Vencidos sem Tratamento (BUG DE BORDA)

Ativos com `data_vencimento < data_base` (já vencidos antes de hoje) não devem:
- Gerar fluxo de caixa (correto em `GeradorFluxoCaixa._gerar_bullet`)
- Aparecer no projetor de patrimônio (pode estar incorreto)

Se um ativo já venceu mas `projetar_ativo` ainda o projeta para o ano corrente,
e `reinvestimento` não o captura (porque não gerou CF), o valor **some** entre anos.

**O que verificar:**
```python
# GeradorFluxoCaixa — ok, já testa isso:
if venc <= data_base:
    return []

# ProjetorPatrimonio — VERIFICAR se também ignora ativos já vencidos:
if venc and date(yr, 1, 1) > venc:
    continue  # só ignora se venceu ANTES de 1/jan do ano projetado
              # mas se venceu em março, aparece em 2026 e some em 2027!
```

Recomendação: documentar claramente no handler ou script que ativos já vencidos
devem ter `data_vencimento=None` (tratados como caixa) OU devem ser adicionados
manualmente ao pool de reinvestimento.

---

### 5. Fallback de API de Mercado (BUG DE CONFIABILIDADE)

APIs do BCB (Focus, SGS) podem retornar 400 para certos indicadores.
Sempre validar que o fallback resulta em premissas economicamente coerentes,
não em valores default arbitrários.

**Padrão problemático:**
```python
# CDI não existe em ExpectativasMercadoAnuais — retorna {} vazio
# Usa default 10.40 sem avisar que são dados incorretos
cdi_pct_aa=dados.get("CDI", {}).get(ano, 10.40)
# ^ CDI real em 2026 é ~13.60% — subestima 3.2pp!
```

**Padrão correto:**
```python
# CDI segue Selic −0.10pp (convenção mercado BR)
selic = dados.get("Selic", {}).get(ano, 10.50)
cdi = dados.get("CDI", {}).get(ano) or max(selic - 0.10, 0.01)
```

Para cada indicador buscado via API:
- Qual é o fallback se a API retornar 400?
- O fallback é economicamente realista ou usa constante arbitrária?
- O log avisa claramente que está usando fallback?

Verifique também que `logger.warning` usa structlog (keyword args), não `logging.getLogger` (apenas args posicionais):
```python
# Errado com logging padrão:
logger.warning("erro", indicador=ind, status=400)  # TypeError!

# Correto com structlog:
import structlog
logger = structlog.get_logger(__name__)
logger.warning("erro", indicador=ind, status=400)  # OK
```

---

### 6. Convenção de Taxa por Indexador (BUG DE INTERPRETAÇÃO)

Cada indexador tem uma convenção diferente para o campo `taxa`:

| Indexador | Convenção | Exemplo | Fórmula |
|-----------|-----------|---------|---------|
| CDI       | % do CDI  | 98.5    | `pos × (1 + CDI × taxa/100)^frac` |
| IPCA      | spread a.a. em %  | 8.39 | `pos × ((1+IPCA) × (1+taxa/100))^frac` |
| PRE       | taxa a.a. em %    | 15.55 | `pos × (1 + taxa/100)^frac` |
| MULTI/RV  | irrelevante (usa alpha interno) | — | `pos × (1 + CDI + alpha)^frac` |

Verificar:
- CDI+spread (ex: CRA CDI+3.10%) deve usar indexador `MULTI` ou `CDI_MAIS`, não `CDI`
  com taxa=3.10 (que seria interpretado como 3,10% DO CDI — valor economicamente absurdo)
- IPCA sem spread (fundos) com `taxa=None` → deve resultar em `IPCA + 0%` = IPCA puro
- CDI sem taxa explícita (fundos DI) com `taxa=None` → deve ser 100% CDI, não 0% CDI

---

### 7. Tabela IR — Cálculo de Dias Corretos

A tabela regressiva de IR em RF usa dias corridos desde a aplicação:
- ≤ 180 dias: 22,5%
- 181–360 dias: 20,0%
- 361–720 dias: 17,5%
- > 720 dias: 15,0%

**Verificar:**
- `(data_evento - data_aplicacao).days` — usa `.days` (int), não `.total_seconds()`?
- Para ativos isentos (CRI, CRA, Debêntures incentivadas PF): `aliquota = 0.0`, não `None`
- Cupons NTN-B: data de aplicação é a data de emissão do título, não a data do cupom
- Se `data_aplicacao` for `None`: usar alíquota conservadora (22,5%) ou a menor (15%)?
  Documentar a escolha e aplicar consistentemente

---

### 8. NTN-B — Cupom Semestral

Cupom semestral NTN-B = 6% real a.a. em regime de capitalização composta:
`(1.06)^0.5 − 1 = 2.9563%` por semestre sobre o saldo atualizado pelo IPCA.

**Verificar:**
- Constante `_NTNB_COUPON_SEMESTRAL = 0.029563` (não `0.03` ou `0.06/2 = 0.03`)
- Cupom calculado sobre `posicao` atualizada pelo IPCA, não sobre o valor nominal original
- Meses de pagamento corretos para cada vencimento:
  - Venc. em AGO (agosto/mês 8): paga em FEV (2) e AGO (8) → `pmt_meses=(2, 8)`
  - Venc. em MAI (maio/mês 5): paga em MAI (5) e NOV (11) → `pmt_meses=(5, 11)`
  - Venc. em MAR (março/mês 3): paga em MAR (3) e SET (9) → `pmt_meses=(3, 9)`
- Tesouro IPCA+ SEM "JS" (NTN-B Principal) = bullet, sem cupom semestral

---

### 9. Consistência Temporal nas Projeções

Verificar que para um ativo sem resgate ou carrego inesperado, a série temporal
de patrimônio projetado é **estritamente monotônica crescente** para ativos de RF
positivos com taxas acima de zero.

Se `patrimônio[ano+1] < patrimônio[ano]` para qualquer ano na projeção,
isso indica obrigatoriamente um dos bugs acima (double-count, desaparecimento,
taxa=0, etc.).

Escreva o diagnóstico como um mini teste mental:
- Para um Fundo CDI de R$1M com CDI=13%, projete manualmente 2026→2027
- Compare com o output do código
- Se divergir mais que 1%, investigar

---

## FORMATO DE OUTPUT

Para cada arquivo revisado, organize o relatório assim:

### ✅ [ARQUIVO] — OK
Nenhum problema encontrado.

### ⚠️ [ARQUIVO] — Problemas encontrados

**[CRÍTICO / AVISO / SUGESTÃO]** `arquivo.py:linha`
- **Regra:** (ex: "Padrão Falsy-Float — item 1")
- **Problema:** descrição clara do que está errado
- **Impacto financeiro:** quanto isso afeta as projeções (ex: "subestima CDI em 3.2pp")
- **Correção:**
```python
# Antes (errado)
...
# Depois (correto)
...
```

---

## CONTEXTO DO DOMÍNIO

Este projeto projeta carteiras de renda fixa de clientes de assessoria de investimentos.
Erros de cálculo têm impacto direto na qualidade das recomendações ao cliente.

Premissas BCB Focus (referência 06/03/2026):
- CDI: 2026=13.60%, 2027=11.40%, 2028-2031=10.40%
- IPCA: 2026=4.11%, 2027=3.74%, 2028-2031=3.50%
- Selic: 2026=13.70%, 2027=11.50%, 2028-2031=10.50%

CDI atual: 14.90% a.a. (BCB SGS série 12, mar/2026)
