'use client';
// Relatório PDF de apuração de IR — @react-pdf/renderer
// DEVE ser carregado com dynamic import (ssr: false) — não funciona no Node.js

import {
  Document, Page, Text, View, StyleSheet, Font,
  pdf,
} from '@react-pdf/renderer';
import type { ApuracaoMensalDoc, ResultadoCestaDoc } from '@/lib/ir/types/firestore-schema';
import { DARF_MINIMO_CENTAVOS } from '@/lib/ir/types/asset-types';

// ─── Identidade visual SVN ────────────────────────────────────────────────────

const CARBON  = '#221B19';
const RUBY    = '#AC3631';
const PAPER   = '#FFF8F3';
const BLUE_SK = '#CFE3DA';
const BODY    = '#3D3530';
const MUTED   = '#8A7F7B';

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    paddingHorizontal: 36,
    paddingVertical: 32,
    fontFamily: 'Helvetica',
    color: BODY,
    fontSize: 9,
  },
  // Cabeçalho
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottom: `1.5px solid ${CARBON}`,
  },
  headerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: CARBON,
  },
  headerSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  headerLogo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: CARBON,
    textAlign: 'right',
  },
  // Seção
  section: { marginBottom: 14 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: CARBON,
    backgroundColor: BLUE_SK,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 6,
    borderRadius: 2,
  },
  // Tabela
  table: { width: '100%' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: CARBON,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    color: '#FFF8F3',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottom: `0.5px solid #E5DDD8`,
  },
  tableRowAlt: { backgroundColor: '#F5EDE8' },
  // Colunas
  colLabel: { flex: 3 },
  colVal:   { flex: 1, textAlign: 'right' },
  // DARF box
  darfBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARBON,
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  darfLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#FFF8F3',
    fontSize: 10,
  },
  darfValor: {
    fontFamily: 'Helvetica-Bold',
    color: '#FFF8F3',
    fontSize: 14,
  },
  darfSub: { color: MUTED, fontSize: 7, marginTop: 2 },
  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `0.5px solid ${MUTED}`,
    paddingTop: 4,
  },
  footerText: { fontSize: 7, color: MUTED },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function brl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatAnoMes(anoMes: string): string {
  const [y, m] = anoMes.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[Number(m) - 1]}/${y}`;
}

// ─── Linhas da tabela de cesta ────────────────────────────────────────────────

interface LinhaProps { label: string; valor: number; negativo?: boolean; bold?: boolean; alt?: boolean }

function Linha({ label, valor, negativo, bold, alt }: LinhaProps) {
  const cor = negativo && valor < 0 ? RUBY : BODY;
  return (
    <View style={[styles.tableRow, alt ? styles.tableRowAlt : {}]}>
      <Text style={[styles.colLabel, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>{label}</Text>
      <Text style={[styles.colVal, { color: cor }, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>
        {brl(valor)}
      </Text>
    </View>
  );
}

// ─── Tabela de uma cesta ──────────────────────────────────────────────────────

function TabelaCesta({ titulo, cesta, aliquotaLabel }: {
  titulo: string;
  cesta: ResultadoCestaDoc;
  aliquotaLabel: string;
}) {
  const darfAPagar = cesta.darfTotalEmCentavos >= DARF_MINIMO_CENTAVOS;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{titulo} — {aliquotaLabel}</Text>
      <View style={styles.table}>
        <Linha label="Vendas brutas" valor={cesta.vendasBrutasEmCentavos} alt />
        {cesta.vendasAcoesSTemCentavos !== undefined && (
          <Linha label="  Vendas ações+units (isenção R$20k)" valor={cesta.vendasAcoesSTemCentavos} />
        )}
        <Linha label="Resultado líquido (ganho/perda)" valor={cesta.ganhoLiquidoEmCentavos} negativo alt />
        <Linha label="Saldo prejuízo anterior" valor={-cesta.saldoPrejuizoAnteriorEmCentavos} negativo />
        <Linha label="Prejuízo compensado" valor={cesta.prejuizoCompensadoEmCentavos} alt />
        <Linha label="Base de cálculo" valor={cesta.baseCalculoEmCentavos} bold />
        <Linha label={`IR bruto (${(cesta.aliquota * 100).toFixed(0)}%)`} valor={cesta.irBrutoEmCentavos} alt />
        <Linha label="IRRF do mês" valor={-cesta.irrfEmCentavos} negativo />
        <Linha label="IRRF acumulado meses anteriores" valor={-cesta.irrfAcumuladoMesesAnterioresEmCentavos} negativo alt />
        <Linha label="DARF acumulado meses anteriores" valor={cesta.darfAcumuladoMesAnteriorEmCentavos} />
        <Linha
          label={darfAPagar ? 'DARF a pagar (código 6015)' : 'DARF (abaixo de R$10 — acumula)'}
          valor={cesta.darfTotalEmCentavos}
          bold
          alt
          negativo={!darfAPagar}
        />
        {cesta.isento && (
          <View style={[styles.tableRow, { backgroundColor: '#F0FAF5' }]}>
            <Text style={[styles.colLabel, { color: '#2D6A4F', fontSize: 8 }]}>
              Mês isento (vendas ações ≤ R$20.000) — IR não devido
            </Text>
          </View>
        )}
        <Linha label="Novo saldo de prejuízo" valor={cesta.novoSaldoPrejuizoEmCentavos} />
      </View>
    </View>
  );
}

// ─── Documento PDF ────────────────────────────────────────────────────────────

interface Props {
  apuracao: ApuracaoMensalDoc;
  nomeCliente: string;
}

function RelatorioIRDoc({ apuracao, nomeCliente }: Props) {
  const darfTotal = apuracao.darfTotalEmCentavos;
  const darfDevido = darfTotal >= DARF_MINIMO_CENTAVOS;
  const geradoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Document title={`IR ${formatAnoMes(apuracao.anoMes)} — ${nomeCliente}`}>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Apuração de IR — Renda Variável</Text>
            <Text style={styles.headerSub}>
              {nomeCliente} · Competência: {formatAnoMes(apuracao.anoMes)} · {apuracao.notasProcessadas.length} nota{apuracao.notasProcessadas.length !== 1 ? 's' : ''} processada{apuracao.notasProcessadas.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View>
            <Text style={styles.headerLogo}>SVN Investimentos | XP</Text>
            <Text style={styles.headerSub}>Gerado em {geradoEm}</Text>
          </View>
        </View>

        {/* DARF total */}
        <View style={styles.darfBox}>
          <View>
            <Text style={styles.darfLabel}>
              {darfDevido ? 'DARF a recolher — Código 6015' : 'Nenhum DARF devido este mês'}
            </Text>
            <Text style={styles.darfSub}>
              {darfDevido && apuracao.vencimentoDarf
                ? `Vencimento: ${formatData(apuracao.vencimentoDarf)}`
                : darfDevido ? 'Vencimento: último dia útil do mês seguinte' : 'Sem obrigação de recolhimento'}
            </Text>
          </View>
          <Text style={styles.darfValor}>
            {darfDevido ? brl(darfTotal) : '—'}
          </Text>
        </View>

        <View style={{ marginTop: 16 }} />

        {/* Cesta A — Swing Trade */}
        <TabelaCesta
          titulo="Cesta A — Ações, ETFs, BDRs, Opções"
          cesta={apuracao.cestaA_ST}
          aliquotaLabel="Swing Trade · 15%"
        />

        {/* Cesta A — Day Trade */}
        <TabelaCesta
          titulo="Cesta A — Ações, ETFs, BDRs, Opções"
          cesta={apuracao.cestaA_DT}
          aliquotaLabel="Day Trade · 20%"
        />

        {/* Cesta B — Swing Trade */}
        <TabelaCesta
          titulo="Cesta B — FIIs e Fiagros"
          cesta={apuracao.cestaB_ST}
          aliquotaLabel="Swing Trade · 20%"
        />

        {/* Cesta B — Day Trade */}
        <TabelaCesta
          titulo="Cesta B — FIIs e Fiagros"
          cesta={apuracao.cestaB_DT}
          aliquotaLabel="Day Trade · 20%"
        />

        {/* Aviso legal */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <Text style={{ fontSize: 7, color: MUTED, lineHeight: 1.4 }}>
            Este relatório foi gerado automaticamente com base nas notas de corretagem importadas. Verifique os valores antes de recolher o DARF.
            Não substitui orientação fiscal profissional. Responsabilidade tributária é do investidor (art. 65, Lei 8.383/1991).
          </Text>
        </View>

        {/* Rodapé com número de página */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>SVN Investimentos | XP — Documento confidencial</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Função exportável: gera e faz download do PDF ───────────────────────────

export async function baixarRelatorioIR(apuracao: ApuracaoMensalDoc, nomeCliente: string): Promise<void> {
  const blob = await pdf(<RelatorioIRDoc apuracao={apuracao} nomeCliente={nomeCliente} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `IR_${apuracao.anoMes}_${nomeCliente.replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
