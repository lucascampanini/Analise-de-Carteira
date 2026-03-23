"""
Teste de Stress E2E Massivo — CRM Assessor
==========================================
Cobre todos os módulos: Clientes, Anotações, Eventos, Reuniões,
Leads, Ofertas (CRUD + Excel), Diversificador, Fundos, Edge Cases,
Concorrência e Volume.

Execução:
    pytest tests/e2e/test_crm_stress.py -v --tb=short -p no:timeout

Pré-requisito: servidor rodando (iniciar.bat)
"""

from __future__ import annotations

import io
import threading
import time
import uuid
from datetime import date, datetime, timedelta

import openpyxl
import pytest
import requests

BASE       = "http://localhost:8000"
ASSISTENTE = f"{BASE}/assistente"


# ── helpers ───────────────────────────────────────────────────────────────────

def r(method: str, path: str, retries: int = 3, **kwargs) -> requests.Response:
    url = path if path.startswith("http") else f"{ASSISTENTE}{path}"
    for attempt in range(retries):
        try:
            return requests.request(method, url, timeout=30, **kwargs)
        except requests.exceptions.ConnectionError:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def ok(resp: requests.Response, ctx: str = "") -> dict | list | bytes:
    assert resp.status_code < 300, (
        f"[{ctx}] esperado 2xx, got {resp.status_code}: {resp.text[:400]}"
    )
    ct = resp.headers.get("content-type", "")
    if "application/json" in ct:
        return resp.json()
    return resp.content


def xlsx(rows: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def aceita_sem_dados(resp: requests.Response, ctx: str = "") -> None:
    """Endpoints que dependem de planilha importada podem retornar 500 sem dados."""
    assert resp.status_code in (200, 500), (
        f"[{ctx}] status inesperado {resp.status_code}: {resp.text[:200]}"
    )


# ── fixture de sessão ─────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def servidor_online():
    try:
        requests.get(BASE, timeout=5)
    except Exception:
        pytest.skip("Servidor offline — execute iniciar.bat primeiro")


@pytest.fixture(scope="session")
def conta_real() -> str | None:
    clientes = r("GET", "/clientes").json()
    return clientes[0]["codigo_conta"] if clientes else None


@pytest.fixture(scope="session")
def nome_real(conta_real) -> str:
    if not conta_real:
        return "Cliente Stress"
    clientes = r("GET", "/clientes").json()
    return clientes[0].get("nome", "Cliente Stress")


# ══════════════════════════════════════════════════════════════════════════════
# 1. CLIENTES
# ══════════════════════════════════════════════════════════════════════════════

class TestClientes:

    def test_listar_retorna_lista(self):
        body = ok(r("GET", "/clientes"), "listar_clientes")
        assert isinstance(body, list)

    def test_listar_campos_obrigatorios(self):
        clientes = ok(r("GET", "/clientes"), "campos")
        if clientes:
            c = clientes[0]
            assert "codigo_conta" in c, f"Sem codigo_conta: {list(c.keys())}"

    def test_historico_imports(self):
        body = ok(r("GET", "/historico-imports"), "historico")
        assert isinstance(body, list)

    def test_gerar_alertas_aniversario(self):
        resp = r("POST", "/clientes/gerar-alertas-aniversario")
        assert resp.status_code in (200, 204, 500), resp.text[:200]

    def test_anotacoes_conta_inexistente(self):
        resp = r("GET", "/clientes/CONTA_INEXISTENTE_99999/anotacoes")
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)

    def test_crud_anotacao_completo(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        texto = f"[STRESS] nota {uuid.uuid4().hex[:8]}"
        body = ok(r("POST", f"/clientes/{conta_real}/anotacoes",
                    json={"tipo": "NOTA", "texto": texto}), "criar_anotacao")
        aid = body["id"]

        lista = ok(r("GET", f"/clientes/{conta_real}/anotacoes"), "listar_anotacoes")
        assert any(a["id"] == aid for a in lista)

        del_resp = r("DELETE", f"/anotacoes/{aid}")
        assert del_resp.status_code in (200, 204)

        lista2 = ok(r("GET", f"/clientes/{conta_real}/anotacoes"), "apos_delete")
        assert not any(a["id"] == aid for a in lista2)

    def test_todos_tipos_anotacao(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        ids = []
        for tipo in ["NOTA", "LIGACAO", "REUNIAO", "EMAIL", "WHATSAPP"]:
            body = ok(r("POST", f"/clientes/{conta_real}/anotacoes",
                        json={"tipo": tipo, "texto": f"[STRESS] {tipo}"}), tipo)
            ids.append(body["id"])
        assert len(ids) == 5
        for aid in ids:
            r("DELETE", f"/anotacoes/{aid}")

    def test_anotacao_texto_longo(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        texto = "X" * 3000
        body = ok(r("POST", f"/clientes/{conta_real}/anotacoes",
                    json={"tipo": "NOTA", "texto": texto}), "texto_longo")
        r("DELETE", f"/anotacoes/{body['id']}")

    def test_anotacao_caracteres_especiais(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        texto = "Reunião às 14h — discussão sobre RF & ações (10% a.a.) <teste>"
        body = ok(r("POST", f"/clientes/{conta_real}/anotacoes",
                    json={"tipo": "NOTA", "texto": texto}), "especiais")
        r("DELETE", f"/anotacoes/{body['id']}")

    def test_30_anotacoes_em_massa(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        ids = []
        tipos = ["NOTA", "LIGACAO", "EMAIL", "WHATSAPP", "REUNIAO"]
        for i in range(30):
            body = ok(r("POST", f"/clientes/{conta_real}/anotacoes",
                        json={"tipo": tipos[i % 5], "texto": f"[STRESS-MASSA] {i:02d}"}),
                      f"massa_{i}")
            ids.append(body["id"])

        lista = ok(r("GET", f"/clientes/{conta_real}/anotacoes"), "lista_massa")
        ids_set = {a["id"] for a in lista}
        encontrados = sum(1 for aid in ids if aid in ids_set)
        assert encontrados == 30, f"Só encontrou {encontrados}/30"

        for aid in ids:
            r("DELETE", f"/anotacoes/{aid}")


# ══════════════════════════════════════════════════════════════════════════════
# 2. EVENTOS (TAREFAS)
# ══════════════════════════════════════════════════════════════════════════════

class TestEventos:

    def test_listar_proximos_30_dias(self):
        body = ok(r("GET", "/eventos/proximos?dias=30"), "eventos_30d")
        assert isinstance(body, list)

    def test_listar_proximos_60_dias(self):
        ok(r("GET", "/eventos/proximos?dias=60"), "eventos_60d")

    def test_listar_proximos_365_dias(self):
        ok(r("GET", "/eventos/proximos?dias=365"), "eventos_365d")

    def test_criar_tarefa(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        body = ok(r("POST", "/eventos", json={
            "tipo": "TAREFA",
            "descricao": f"[STRESS] Tarefa {uuid.uuid4().hex[:6]}",
            "data_evento": (date.today() + timedelta(days=7)).isoformat(),
            "alertar_dias_antes": 1,
            "codigo_conta": conta,
            "nome_cliente": nome_real,
        }), "criar_tarefa")
        assert "id" in body
        r("DELETE", f"/eventos/{body['id']}")

    def test_ciclo_completo_criar_concluir_deletar(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        body = ok(r("POST", "/eventos", json={
            "tipo": "TAREFA",
            "descricao": "[STRESS] Ciclo completo",
            "data_evento": (date.today() + timedelta(days=3)).isoformat(),
            "alertar_dias_antes": 0,
            "codigo_conta": conta,
            "nome_cliente": nome_real,
        }), "criar_ciclo")
        eid = body["id"]

        concluir = r("PATCH", f"/eventos/{eid}/concluir")
        assert concluir.status_code in (200, 204)

        deletar = r("DELETE", f"/eventos/{eid}")
        assert deletar.status_code in (200, 204)

    def test_deletar_inexistente_nao_retorna_500(self):
        resp = r("DELETE", f"/eventos/{uuid.uuid4()}")
        assert resp.status_code != 500

    def test_criar_20_eventos_sequenciais(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        ids = []
        for i in range(20):
            body = ok(r("POST", "/eventos", json={
                "tipo": "TAREFA",
                "descricao": f"[STRESS-VOLUME] Evento {i:02d}",
                "data_evento": (date.today() + timedelta(days=i + 1)).isoformat(),
                "alertar_dias_antes": 0,
                "codigo_conta": conta,
                "nome_cliente": nome_real,
            }), f"evento_{i}")
            ids.append(body["id"])
        assert len(ids) == 20
        for eid in ids:
            r("DELETE", f"/eventos/{eid}")

    def test_evento_data_passada_nao_retorna_500(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        resp = r("POST", "/eventos", json={
            "tipo": "TAREFA",
            "descricao": "[STRESS] Data passada",
            "data_evento": "2023-01-01",
            "alertar_dias_antes": 0,
            "codigo_conta": conta,
            "nome_cliente": None,
        })
        assert resp.status_code != 500
        if resp.status_code < 300:
            r("DELETE", f"/eventos/{resp.json()['id']}")

    def test_evento_sem_nome_cliente(self, conta_real):
        conta = conta_real or "STRESS"
        resp = r("POST", "/eventos", json={
            "tipo": "TAREFA",
            "descricao": "[STRESS] Sem nome cliente",
            "data_evento": (date.today() + timedelta(days=5)).isoformat(),
            "alertar_dias_antes": 0,
            "codigo_conta": conta,
            "nome_cliente": None,
        })
        assert resp.status_code < 300
        r("DELETE", f"/eventos/{resp.json()['id']}")


# ══════════════════════════════════════════════════════════════════════════════
# 3. REUNIÕES
# ══════════════════════════════════════════════════════════════════════════════

class TestReunioes:

    def _dt(self, dias: int, hora: str = "10:00") -> str:
        return (datetime.now() + timedelta(days=dias)).strftime(f"%Y-%m-%dT{hora}:00")

    def test_listar_proximas_30_dias(self):
        body = ok(r("GET", "/reunioes/proximas?dias=30"), "reunioes_30d")
        assert isinstance(body, list)

    def test_listar_proximas_90_dias(self):
        ok(r("GET", "/reunioes/proximas?dias=90"), "reunioes_90d")

    def test_criar_reuniao_basica(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        resp = r("POST", "/reunioes", json={
            "titulo": f"[STRESS] Reunião {uuid.uuid4().hex[:6]}",
            "data_hora": self._dt(5),
            "duracao_minutos": 60,
            "codigo_conta": conta,
            "nome_cliente": nome_real,
            "descricao": None,
            "gerar_relatorio": False,
            "criar_no_outlook": False,
        })
        ok(resp, "criar_reuniao")

    def test_criar_e_cancelar(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        body = ok(r("POST", "/reunioes", json={
            "titulo": "[STRESS] Reunião cancelar",
            "data_hora": self._dt(10),
            "duracao_minutos": 45,
            "codigo_conta": conta,
            "nome_cliente": nome_real,
            "descricao": "Pauta de teste",
            "gerar_relatorio": False,
            "criar_no_outlook": False,
        }), "criar_cancelar")
        rid = body.get("id") or body.get("reuniao_id")
        if rid:
            resp = r("PATCH", f"/reunioes/{rid}/cancelar")
            assert resp.status_code in (200, 204)

    def test_multiplas_duracoes(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        for dur in [15, 30, 45, 60, 90, 120]:
            resp = r("POST", "/reunioes", json={
                "titulo": f"[STRESS] {dur}min",
                "data_hora": self._dt(dur),
                "duracao_minutos": dur,
                "codigo_conta": conta,
                "nome_cliente": nome_real,
                "descricao": None,
                "gerar_relatorio": False,
                "criar_no_outlook": False,
            })
            assert resp.status_code < 300, f"dur={dur}: {resp.text[:100]}"

    def test_criar_10_reunioes_sequenciais(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        sucessos = 0
        for i in range(10):
            resp = r("POST", "/reunioes", json={
                "titulo": f"[STRESS-VOLUME] Reunião {i:02d}",
                "data_hora": self._dt(i + 1, f"{9 + i}:00"),
                "duracao_minutos": 30,
                "codigo_conta": conta,
                "nome_cliente": nome_real,
                "descricao": f"Pauta {i}",
                "gerar_relatorio": False,
                "criar_no_outlook": False,
            })
            if resp.status_code < 300:
                sucessos += 1
        assert sucessos >= 9, f"Apenas {sucessos}/10 reuniões criadas"

    def test_reuniao_com_pauta_longa(self, conta_real, nome_real):
        conta = conta_real or "STRESS"
        pauta = "• Ponto " * 100  # ~800 chars
        resp = r("POST", "/reunioes", json={
            "titulo": "[STRESS] Reunião pauta longa",
            "data_hora": self._dt(15),
            "duracao_minutos": 90,
            "codigo_conta": conta,
            "nome_cliente": nome_real,
            "descricao": pauta,
            "gerar_relatorio": False,
            "criar_no_outlook": False,
        })
        assert resp.status_code < 300


# ══════════════════════════════════════════════════════════════════════════════
# 4. LEADS
# ══════════════════════════════════════════════════════════════════════════════

class TestLeads:
    ESTAGIOS = ["PROSPECTO", "CONTATO", "PROPOSTA", "CLIENTE"]
    ORIGENS  = ["INDICACAO", "EVENTO", "LINKEDIN", "COLD_CALL", "OUTRO"]

    def test_listar(self):
        body = ok(r("GET", "/leads"), "listar_leads")
        assert isinstance(body, list)

    def test_listar_por_todos_estagios(self):
        for e in self.ESTAGIOS:
            body = ok(r("GET", f"/leads?estagio={e}"), f"leads_{e}")
            assert isinstance(body, list)

    def test_ciclo_completo_criar_avancar_deletar(self):
        body = ok(r("POST", "/leads", json={
            "nome": f"Lead Stress {uuid.uuid4().hex[:6]}",
            "telefone": "11999990000",
            "email": "stress@test.com",
            "origem": "INDICACAO",
            "valor_potencial": 500000,
            "estagio": "PROSPECTO",
            "anotacoes": "Lead de stress test",
        }), "criar_lead")
        lid = body["id"]

        for estagio in ["CONTATO", "PROPOSTA", "CLIENTE"]:
            resp = r("PATCH", f"/leads/{lid}/estagio?estagio={estagio}")
            assert resp.status_code < 300, f"estagio={estagio}: {resp.text[:100]}"

        upd = r("PATCH", f"/leads/{lid}", json={
            "nome": "Lead Stress Atualizado",
            "telefone": "11888880000",
            "valor_potencial": 750000,
            "estagio": "CLIENTE",
        })
        assert upd.status_code < 300

        del_resp = r("DELETE", f"/leads/{lid}")
        assert del_resp.status_code in (200, 204)

    def test_todas_origens(self):
        ids = []
        for origem in self.ORIGENS:
            body = ok(r("POST", "/leads", json={
                "nome": f"Lead {origem} {uuid.uuid4().hex[:4]}",
                "origem": origem,
                "estagio": "PROSPECTO",
            }), f"origem_{origem}")
            ids.append(body["id"])
        assert len(ids) == 5
        for lid in ids:
            r("DELETE", f"/leads/{lid}")

    def test_template_excel(self):
        resp = r("GET", "/leads/template-excel")
        assert resp.status_code == 200
        assert "spreadsheet" in resp.headers.get("content-type", "")
        assert len(resp.content) > 500

    def test_importar_excel_10_leads(self):
        linhas = [["Nome *", "Telefone", "Email", "Origem", "Patrimônio Potencial (R$)", "Estágio", "Anotações"]]
        for i in range(10):
            linhas.append([f"Lead Import {i}", f"119999{i:05d}", f"l{i}@t.com",
                           "INDICACAO", (i + 1) * 50000, "PROSPECTO", f"nota {i}"])
        resp = r("POST", "/leads/importar-excel",
                 files={"arquivo": ("leads.xlsx", xlsx(linhas),
                                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        body = ok(resp, "importar_10_leads")
        assert body.get("importados", 0) >= 8

    def test_criar_100_leads_e_deletar(self):
        ids = []
        for i in range(100):
            resp = r("POST", "/leads", json={
                "nome": f"Lead Volume {i:03d}",
                "origem": self.ORIGENS[i % 5],
                "estagio": self.ESTAGIOS[i % 4],
                "valor_potencial": i * 5000,
            })
            if resp.status_code < 300:
                ids.append(resp.json()["id"])

        assert len(ids) >= 90, f"Só criou {len(ids)}/100"

        falhas = sum(1 for lid in ids if r("DELETE", f"/leads/{lid}").status_code >= 500)
        assert falhas == 0, f"{falhas} deletes retornaram 5xx"

    def test_lead_campos_minimos(self):
        body = ok(r("POST", "/leads", json={"nome": "Lead Mínimo", "estagio": "PROSPECTO"}), "minimo")
        r("DELETE", f"/leads/{body['id']}")

    def test_lead_valor_potencial_zero(self):
        body = ok(r("POST", "/leads", json={
            "nome": "Lead Zero", "estagio": "PROSPECTO", "valor_potencial": 0
        }), "valor_zero")
        r("DELETE", f"/leads/{body['id']}")

    def test_lead_valor_potencial_alto(self):
        body = ok(r("POST", "/leads", json={
            "nome": "Lead Alto Patrimônio", "estagio": "PROSPECTO", "valor_potencial": 50_000_000
        }), "alto_valor")
        r("DELETE", f"/leads/{body['id']}")

    def test_deletar_inexistente_nao_retorna_500(self):
        resp = r("DELETE", f"/leads/{uuid.uuid4()}")
        assert resp.status_code != 500

    def test_atualizar_todos_estagios(self):
        body = ok(r("POST", "/leads", json={"nome": "Lead Estagios", "estagio": "PROSPECTO"}), "criar_estagios")
        lid = body["id"]
        for e in self.ESTAGIOS:
            resp = r("PATCH", f"/leads/{lid}/estagio?estagio={e}")
            assert resp.status_code < 300
        r("DELETE", f"/leads/{lid}")


# ══════════════════════════════════════════════════════════════════════════════
# 5. OFERTAS MENSAIS
# ══════════════════════════════════════════════════════════════════════════════

class TestOfertas:

    @pytest.fixture()
    def oferta(self):
        body = ok(r("POST", "/ofertas", json={
            "nome": f"[STRESS] {uuid.uuid4().hex[:8]}",
            "descricao": "Stress test",
            "data_liquidacao": (date.today() + timedelta(days=30)).isoformat(),
            "roa": 0.75,
        }), "fixture_oferta")
        yield body
        r("DELETE", f"/ofertas/{body['id']}")

    def test_listar(self):
        body = ok(r("GET", "/ofertas"), "listar_ofertas")
        assert isinstance(body, list)

    def test_criar_e_deletar(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] Criar Deletar", "roa": 0.5}), "criar")
        oid = body["id"]
        ok(r("GET", f"/ofertas/{oid}"), "detalhe")
        assert r("DELETE", f"/ofertas/{oid}").status_code in (200, 204)

    def test_detalhe(self, oferta):
        ok(r("GET", f"/ofertas/{oferta['id']}"), "detalhe")

    def test_atualizar_nome_e_roa(self, oferta):
        resp = r("PATCH", f"/ofertas/{oferta['id']}", json={"nome": "[STRESS] Atualizado", "roa": 1.2})
        assert resp.status_code < 300

    def test_preview_receita(self, oferta):
        ok(r("GET", f"/ofertas/{oferta['id']}/preview"), "preview")

    def test_resumo_clientes_ofertas(self):
        ok(r("GET", "/ofertas-resumo/clientes"), "resumo")

    def test_template_excel(self):
        resp = r("GET", "/ofertas/template-excel")
        assert resp.status_code == 200
        assert "spreadsheet" in resp.headers.get("content-type", "")
        assert len(resp.content) > 500

    def test_oferta_sem_data_liquidacao(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] Sem data", "roa": 0.3}), "sem_data")
        r("DELETE", f"/ofertas/{body['id']}")

    def test_oferta_roa_zero(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] ROA zero", "roa": 0.0}), "roa_zero")
        r("DELETE", f"/ofertas/{body['id']}")

    def test_oferta_roa_alto(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] ROA alto", "roa": 5.0}), "roa_alto")
        r("DELETE", f"/ofertas/{body['id']}")

    def test_adicionar_cliente_todos_status(self, oferta, conta_real, nome_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        body = ok(r("POST", f"/ofertas/{oferta['id']}/clientes", json={
            "codigo_conta": conta_real,
            "nome_cliente": nome_real,
            "net": 500000,
            "valor_ofertado": 50000,
            "status": "PENDENTE",
        }), "add_cliente")
        item_id = body["id"]

        for status in ["WHATSAPP", "RESERVADO", "PUSH_ENVIADO", "FINALIZADO", "PENDENTE"]:
            resp = r("PATCH", f"/ofertas/{oferta['id']}/clientes/{item_id}", json={
                "codigo_conta": conta_real,
                "valor_ofertado": 50000,
                "status": status,
            })
            assert resp.status_code < 300, f"status={status}"

        assert r("DELETE", f"/ofertas/{oferta['id']}/clientes/{item_id}").status_code in (200, 204)

    def test_importar_excel_3_clientes(self, oferta):
        dados = [
            ["Código Conta *", "Nome do Cliente", "Valor Ofertado (R$)", "Status"],
            ["STRESS001", "Cliente A", 100000, "PENDENTE"],
            ["STRESS002", "Cliente B", 200000, "WHATSAPP"],
            ["STRESS003", "Cliente C", 150000, "RESERVADO"],
        ]
        body = ok(r("POST", f"/ofertas/{oferta['id']}/importar-excel",
                    files={"arquivo": ("o.xlsx", xlsx(dados),
                                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}),
                  "importar_3")
        assert body["importados"] == 3
        assert body["erros"] == []

    def test_importar_excel_50_clientes(self, oferta):
        dados = [["Código Conta *", "Nome do Cliente", "Valor Ofertado (R$)", "Status"]]
        for i in range(50):
            dados.append([f"STRS{i:04d}", f"Cliente {i}", (i + 1) * 10000,
                         ["PENDENTE", "WHATSAPP", "RESERVADO", "PUSH_ENVIADO", "FINALIZADO"][i % 5]])
        body = ok(r("POST", f"/ofertas/{oferta['id']}/importar-excel",
                    files={"arquivo": ("big.xlsx", xlsx(dados),
                                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}),
                  "importar_50")
        assert body["importados"] == 50

    def test_importar_excel_status_invalido_usa_pendente(self, oferta):
        dados = [
            ["Código Conta *", "Nome do Cliente", "Valor Ofertado (R$)", "Status"],
            ["INVLD001", "Cliente Status Inválido", 10000, "STATUS_INVALIDO"],
        ]
        body = ok(r("POST", f"/ofertas/{oferta['id']}/importar-excel",
                    files={"arquivo": ("inv.xlsx", xlsx(dados),
                                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}),
                  "status_invalido")
        assert body["importados"] == 1

    def test_importar_excel_vazio(self, oferta):
        dados = [["Código Conta *", "Nome do Cliente", "Valor Ofertado (R$)", "Status"]]
        body = ok(r("POST", f"/ofertas/{oferta['id']}/importar-excel",
                    files={"arquivo": ("vazio.xlsx", xlsx(dados),
                                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}),
                  "vazio")
        assert body["importados"] == 0

    def test_importar_arquivo_invalido_retorna_400(self, oferta):
        resp = r("POST", f"/ofertas/{oferta['id']}/importar-excel",
                 files={"arquivo": ("invalido.xlsx", b"nao e um xlsx",
                                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        assert resp.status_code == 400

    def test_oferta_inexistente_retorna_404(self):
        resp = r("GET", f"/ofertas/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_deletar_inexistente_nao_retorna_500(self):
        resp = r("DELETE", f"/ofertas/{uuid.uuid4()}")
        assert resp.status_code != 500

    def test_20_ofertas_simultaneas(self):
        ids = []
        for i in range(20):
            body = ok(r("POST", "/ofertas", json={
                "nome": f"[STRESS-20] Produto {i:02d}",
                "roa": round(0.3 + i * 0.05, 2),
                "data_liquidacao": (date.today() + timedelta(days=i + 10)).isoformat(),
            }), f"oferta_{i}")
            ids.append(body["id"])
            time.sleep(0.05)

        lista = ok(r("GET", "/ofertas"), "lista_20")
        ids_lista = {o["id"] for o in lista}
        assert all(oid in ids_lista for oid in ids)

        for oid in ids:
            r("DELETE", f"/ofertas/{oid}")


# ══════════════════════════════════════════════════════════════════════════════
# 6. DIVERSIFICADOR
# ══════════════════════════════════════════════════════════════════════════════

class TestDiversificador:

    def test_vencimentos_30d(self):
        resp = r("GET", "/diversificador/vencimentos?dias=30")
        aceita_sem_dados(resp, "venc_30d")

    def test_vencimentos_90d(self):
        resp = r("GET", "/diversificador/vencimentos?dias=90")
        aceita_sem_dados(resp, "venc_90d")

    def test_vencimentos_365d(self):
        resp = r("GET", "/diversificador/vencimentos?dias=365")
        aceita_sem_dados(resp, "venc_365d")

    def test_resumo_produto(self):
        aceita_sem_dados(r("GET", "/diversificador/resumo-produto"), "resumo_prod")

    def test_exposicao_rf_fundos(self):
        aceita_sem_dados(r("GET", "/diversificador/exposicao-rf-fundos"), "exp_rf")

    def test_exposicao_rv(self):
        aceita_sem_dados(r("GET", "/diversificador/exposicao-rv"), "exp_rv")

    def test_posicoes_conta_inexistente(self):
        resp = r("GET", "/diversificador/posicoes/CONTA_FAKE_9999")
        assert resp.status_code in (200, 404, 500)

    def test_posicoes_rv_conta_inexistente(self):
        resp = r("GET", "/diversificador/posicoes-rv/CONTA_FAKE_9999")
        assert resp.status_code in (200, 404, 500)

    def test_fundos_conta_inexistente(self):
        resp = r("GET", "/diversificador/fundos/CONTA_FAKE_9999")
        assert resp.status_code in (200, 404, 500)

    def test_previdencia_conta_inexistente(self):
        resp = r("GET", "/diversificador/previdencia/CONTA_FAKE_9999")
        assert resp.status_code in (200, 404, 500)

    def test_buscar_ticker_inexistente_retorna_lista_vazia(self):
        resp = r("GET", "/diversificador/buscar-por-ticker?ticker=XXXXX99")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_buscar_ticker_vazio(self):
        resp = r("GET", "/diversificador/buscar-por-ticker?ticker=")
        assert resp.status_code in (200, 422)

    def test_buscar_tickers_comuns(self):
        for ticker in ["PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3"]:
            resp = r("GET", f"/diversificador/buscar-por-ticker?ticker={ticker}")
            assert resp.status_code == 200, f"ticker={ticker}"
            assert isinstance(resp.json(), list)

    def test_posicoes_clientes_reais(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        for ep in [
            f"/diversificador/posicoes/{conta_real}",
            f"/diversificador/posicoes-rv/{conta_real}",
            f"/diversificador/fundos/{conta_real}",
            f"/diversificador/previdencia/{conta_real}",
        ]:
            resp = r("GET", ep)
            assert resp.status_code in (200, 404, 500), f"{ep}: {resp.status_code}"


# ══════════════════════════════════════════════════════════════════════════════
# 7. FUNDOS
# ══════════════════════════════════════════════════════════════════════════════

class TestFundos:

    def test_listar(self):
        resp = r("GET", "/fundos")
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)

    def test_campos_se_houver_dados(self):
        resp = r("GET", "/fundos")
        if resp.status_code != 200:
            pytest.skip("Sem dados de fundos")
        fundos = resp.json()
        if fundos:
            f = fundos[0]
            assert "cnpj" in f or "nome" in f or "nome_fundo" in f


# ══════════════════════════════════════════════════════════════════════════════
# 8. STRESS: CONCORRÊNCIA
# ══════════════════════════════════════════════════════════════════════════════

class TestConcorrencia:

    def test_10_gets_paralelos(self):
        """10 GETs simultâneos em endpoints sem dependência de dados."""
        endpoints = [
            "/clientes", "/leads", "/ofertas",
            "/reunioes/proximas?dias=30",
            "/eventos/proximos?dias=30",
            "/historico-imports",
            "/ofertas-resumo/clientes",
            "/diversificador/buscar-por-ticker?ticker=PETR4",
            "/leads?estagio=PROSPECTO",
            "/leads?estagio=CLIENTE",
        ]
        resultados: list[int] = []
        lock = threading.Lock()

        def get(ep):
            try:
                resp = requests.get(f"{ASSISTENTE}{ep}", timeout=30)
                with lock:
                    resultados.append(resp.status_code)
            except Exception:
                with lock:
                    resultados.append(0)

        threads = [threading.Thread(target=get, args=(ep,)) for ep in endpoints]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=35)

        assert len(resultados) == 10
        falhas_5xx = [s for s in resultados if s >= 500]
        falhas_conn = [s for s in resultados if s == 0]
        assert len(falhas_5xx) == 0, f"5xx: {resultados}"
        assert len(falhas_conn) == 0, f"Conexão: {resultados}"

    def test_20_criacao_leads_paralela(self):
        """20 POSTs simultâneos para leads."""
        ids: list[str] = []
        erros: list[str] = []
        lock = threading.Lock()

        def criar(i):
            try:
                resp = requests.post(
                    f"{ASSISTENTE}/leads",
                    json={"nome": f"Paralelo {i:02d}", "estagio": "PROSPECTO", "origem": "OUTRO"},
                    timeout=30,
                )
                if resp.status_code < 300:
                    with lock:
                        ids.append(resp.json()["id"])
                else:
                    with lock:
                        erros.append(f"{i}:{resp.status_code}")
            except Exception as e:
                with lock:
                    erros.append(str(e))

        threads = [threading.Thread(target=criar, args=(i,)) for i in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=60)

        assert len(erros) == 0, f"Erros na criação paralela: {erros}"
        assert len(ids) == 20

        for lid in ids:
            r("DELETE", f"/leads/{lid}")

    def test_leitura_escrita_simultaneas(self, conta_real):
        """GETs e POSTs ao mesmo tempo no mesmo recurso."""
        if not conta_real:
            pytest.skip("Sem clientes")

        resultados: list[tuple[str, int]] = []
        lock = threading.Lock()

        def get_anotacoes():
            resp = requests.get(f"{ASSISTENTE}/clientes/{conta_real}/anotacoes", timeout=30)
            with lock:
                resultados.append(("GET", resp.status_code))

        def criar_anotacao(i):
            resp = requests.post(
                f"{ASSISTENTE}/clientes/{conta_real}/anotacoes",
                json={"tipo": "NOTA", "texto": f"[STRESS-PARALELO] {i}"},
                timeout=30,
            )
            with lock:
                resultados.append(("POST", resp.status_code))

        threads = (
            [threading.Thread(target=get_anotacoes) for _ in range(5)] +
            [threading.Thread(target=criar_anotacao, args=(i,)) for i in range(5)]
        )
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=60)

        falhas = [(op, s) for op, s in resultados if s >= 500]
        assert len(falhas) == 0, f"Falhas simultâneas: {falhas}"

        # Limpa anotações de stress criadas
        lista = requests.get(f"{ASSISTENTE}/clientes/{conta_real}/anotacoes", timeout=15).json()
        for a in lista:
            if "[STRESS-PARALELO]" in (a.get("texto") or ""):
                requests.delete(f"{ASSISTENTE}/anotacoes/{a['id']}", timeout=10)


# ══════════════════════════════════════════════════════════════════════════════
# 9. STRESS: VOLUME
# ══════════════════════════════════════════════════════════════════════════════

class TestVolume:

    def test_50_anotacoes_e_listagem(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        ids = []
        tipos = ["NOTA", "LIGACAO", "EMAIL", "WHATSAPP", "REUNIAO"]
        for i in range(50):
            body = ok(r("POST", f"/clientes/{conta_real}/anotacoes",
                        json={"tipo": tipos[i % 5], "texto": f"[STRESS-50] nota {i:02d}"}),
                      f"nota_{i}")
            ids.append(body["id"])

        lista = ok(r("GET", f"/clientes/{conta_real}/anotacoes"), "lista_50")
        ids_lista = {a["id"] for a in lista}
        encontrados = sum(1 for aid in ids if aid in ids_lista)
        assert encontrados == 50, f"Só encontrou {encontrados}/50"

        for aid in ids:
            r("DELETE", f"/anotacoes/{aid}")

    def test_5_ofertas_com_50_clientes_excel_cada(self):
        oferta_ids = []
        for i in range(5):
            body = ok(r("POST", "/ofertas", json={
                "nome": f"[STRESS-VOL] Oferta {i}",
                "roa": round(0.4 + i * 0.1, 2),
            }), f"oferta_vol_{i}")
            oferta_ids.append(body["id"])
            time.sleep(0.1)

        for oid in oferta_ids:
            dados = [["Código Conta *", "Nome do Cliente", "Valor Ofertado (R$)", "Status"]]
            for j in range(50):
                dados.append([f"VOL{oid[:4]}{j:02d}", f"Cliente {j}",
                              (j + 1) * 5000,
                              ["PENDENTE", "WHATSAPP", "RESERVADO"][j % 3]])
            body = ok(r("POST", f"/ofertas/{oid}/importar-excel",
                        files={"arquivo": ("vol.xlsx", xlsx(dados),
                                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}),
                      f"import_{oid[:8]}")
            assert body["importados"] == 50

        for oid in oferta_ids:
            r("DELETE", f"/ofertas/{oid}")

    def test_latencia_endpoints_sem_dados(self):
        """Endpoints de leitura pura devem responder em menos de 5s."""
        endpoints = [
            "/clientes", "/leads", "/ofertas",
            "/reunioes/proximas", "/eventos/proximos",
            "/ofertas-resumo/clientes", "/historico-imports",
        ]
        lentos = []
        for ep in endpoints:
            t0 = time.time()
            r("GET", ep)
            elapsed = time.time() - t0
            if elapsed > 5.0:
                lentos.append((ep, round(elapsed, 2)))
        assert not lentos, f"Endpoints lentos (>5s): {lentos}"

    def test_paginacao_leads_volume(self):
        """Cria 30 leads de uma vez e verifica que listagem retorna todos."""
        ids = []
        for i in range(30):
            body = ok(r("POST", "/leads", json={
                "nome": f"Lead Paginação {i:03d}",
                "estagio": "PROSPECTO",
                "valor_potencial": i * 1000,
            }), f"pag_{i}")
            ids.append(body["id"])

        lista = ok(r("GET", "/leads"), "lista_paginacao")
        ids_lista = {l["id"] for l in lista}
        encontrados = sum(1 for lid in ids if lid in ids_lista)
        assert encontrados == 30, f"Só encontrou {encontrados}/30 leads"

        for lid in ids:
            r("DELETE", f"/leads/{lid}")


# ══════════════════════════════════════════════════════════════════════════════
# 10. EDGE CASES
# ══════════════════════════════════════════════════════════════════════════════

class TestEdgeCases:

    def test_oferta_id_inexistente_retorna_404(self):
        assert r("GET", f"/ofertas/{uuid.uuid4()}").status_code == 404

    def test_deletar_oferta_inexistente_nao_retorna_500(self):
        assert r("DELETE", f"/ofertas/{uuid.uuid4()}").status_code != 500

    def test_deletar_lead_inexistente_nao_retorna_500(self):
        assert r("DELETE", f"/leads/{uuid.uuid4()}").status_code != 500

    def test_importar_excel_invalido_oferta_retorna_400(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] Edge Excel", "roa": 0}), "edge_oferta")
        oid = body["id"]
        resp = r("POST", f"/ofertas/{oid}/importar-excel",
                 files={"arquivo": ("x.xlsx", b"nao e xlsx",
                                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        assert resp.status_code == 400
        r("DELETE", f"/ofertas/{oid}")

    def test_importar_excel_oferta_inexistente_retorna_404(self):
        dados = [["Código Conta *"], ["TEST001"]]
        resp = r("POST", f"/ofertas/{uuid.uuid4()}/importar-excel",
                 files={"arquivo": ("x.xlsx", xlsx(dados),
                                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        assert resp.status_code == 404

    def test_evento_data_passada_nao_retorna_500(self, conta_real):
        conta = conta_real or "X"
        resp = r("POST", "/eventos", json={
            "tipo": "TAREFA", "descricao": "Data passada",
            "data_evento": "2020-01-01", "alertar_dias_antes": 0,
            "codigo_conta": conta, "nome_cliente": None,
        })
        assert resp.status_code != 500
        if resp.status_code < 300:
            r("DELETE", f"/eventos/{resp.json()['id']}")

    def test_anotacao_conta_inexistente_nao_retorna_500(self):
        resp = r("POST", "/clientes/CONTA_FAKE_99999/anotacoes",
                 json={"tipo": "NOTA", "texto": "teste"})
        assert resp.status_code != 500

    def test_lead_nome_com_caracteres_especiais(self):
        body = ok(r("POST", "/leads", json={
            "nome": "João & Maria (Filhos) — Herança <R$1M>",
            "estagio": "PROSPECTO",
        }), "chars_especiais")
        r("DELETE", f"/leads/{body['id']}")

    def test_oferta_nome_longo(self):
        nome_longo = "A" * 150
        body = ok(r("POST", "/ofertas", json={"nome": nome_longo, "roa": 0.5}), "nome_longo")
        r("DELETE", f"/ofertas/{body['id']}")

    def test_oferta_sem_roa(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] Sem ROA"}), "sem_roa")
        r("DELETE", f"/ofertas/{body['id']}")

    def test_patch_oferta_apenas_roa(self):
        body = ok(r("POST", "/ofertas", json={"nome": "[STRESS] Patch ROA", "roa": 0.5}), "criar_patch")
        resp = r("PATCH", f"/ofertas/{body['id']}", json={"roa": 2.0})
        assert resp.status_code < 300
        r("DELETE", f"/ofertas/{body['id']}")

    def test_adicionar_cliente_oferta_sem_valor(self, conta_real):
        if not conta_real:
            pytest.skip("Sem clientes")
        body_o = ok(r("POST", "/ofertas", json={"nome": "[STRESS] Edge cliente", "roa": 0}), "edge_o")
        oid = body_o["id"]
        body_c = ok(r("POST", f"/ofertas/{oid}/clientes", json={
            "codigo_conta": conta_real,
            "nome_cliente": "Stress",
            "net": None,
            "valor_ofertado": None,
            "status": "PENDENTE",
        }), "sem_valor")
        r("DELETE", f"/ofertas/{oid}/clientes/{body_c['id']}")
        r("DELETE", f"/ofertas/{oid}")
