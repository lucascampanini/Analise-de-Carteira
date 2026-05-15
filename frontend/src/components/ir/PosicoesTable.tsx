'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { buscarCotacoes, type Cotacao } from '@/lib/ir/cotacoes';
import { AssetClass } from '@/lib/ir/types/asset-types';
import type { PosicaoIRDoc } from '@/lib/ir/types/firestore-schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(n: number) {
  const sinal = n >= 0 ? '+' : '';
  return `${sinal}${n.toFixed(2).replace('.', ',')}%`;
}

// ─── Badge de classe de ativo ─────────────────────────────────────────────────

const CLASSE_CLS: Partial<Record<AssetClass, string>> = {
  [AssetClass.ACAO]:    'bg-slate-100 text-slate-700',
  [AssetClass.UNIT]:    'bg-blue-100 text-blue-700',
  [AssetClass.FII]:     'bg-amber-100 text-amber-700',
  [AssetClass.FIAGRO]:  'bg-yellow-100 text-yellow-700',
  [AssetClass.ETF_RV]:  'bg-emerald-100 text-emerald-700',
  [AssetClass.ETF_RF]:  'bg-teal-100 text-teal-700',
  [AssetClass.BDR]:     'bg-purple-100 text-purple-700',
  [AssetClass.OPCAO]:   'bg-rose-100 text-rose-700',
  [AssetClass.FUTURO]:  'bg-orange-100 text-orange-700',
};

const CLASSE_LABEL: Partial<Record<AssetClass, string>> = {
  [AssetClass.ACAO]:    'Ação',
  [AssetClass.UNIT]:    'Unit',
  [AssetClass.FII]:     'FII',
  [AssetClass.FIAGRO]:  'Fiagro',
  [AssetClass.ETF_RV]:  'ETF RV',
  [AssetClass.ETF_RF]:  'ETF RF',
  [AssetClass.BDR]:     'BDR',
  [AssetClass.OPCAO]:   'Opção',
  [AssetClass.FUTURO]:  'Futuro',
  [AssetClass.DESCONHECIDO]: '?',
};

// Filtros de classe disponíveis
type FiltroClasse = 'todos' | 'acoes' | 'fiis' | 'etfs' | 'bdrs' | 'outros';

const FILTROS: { id: FiltroClasse; label: string; classes: AssetClass[] }[] = [
  { id: 'todos',  label: 'Todos', classes: [] },
  { id: 'acoes',  label: 'Ações',  classes: [AssetClass.ACAO, AssetClass.UNIT] },
  { id: 'fiis',   label: 'FIIs',   classes: [AssetClass.FII, AssetClass.FIAGRO] },
  { id: 'etfs',   label: 'ETFs',   classes: [AssetClass.ETF_RV, AssetClass.ETF_RF] },
  { id: 'bdrs',   label: 'BDRs',   classes: [AssetClass.BDR] },
  { id: 'outros', label: 'Outros', classes: [AssetClass.OPCAO, AssetClass.FUTURO, AssetClass.DESCONHECIDO] },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return <span className="inline-block w-16 h-3.5 bg-slate-100 rounded animate-pulse" />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  posicoes: PosicaoIRDoc[];
}

export function PosicoesTable({ posicoes }: Props) {
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [loadingCot, setLoadingCot] = useState(false);
  const [erroApi, setErroApi] = useState(false);
  const [filtro, setFiltro] = useState<FiltroClasse>('todos');
  const [ultimaAtt, setUltimaAtt] = useState<Date | null>(null);

  const fetchCotacoes = async () => {
    if (!posicoes.length) return;
    setLoadingCot(true);
    setErroApi(false);
    try {
      const tickers = posicoes.map((p) => p.ticker);
      const data = await buscarCotacoes(tickers);
      setCotacoes(data);
      setUltimaAtt(new Date());
    } catch {
      setErroApi(true);
    } finally {
      setLoadingCot(false);
    }
  };

  // Busca cotações ao montar e quando posições mudam
  useEffect(() => { fetchCotacoes(); }, [posicoes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!posicoes.length) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Nenhuma posição em aberto. Importe notas de corretagem para começar.
      </div>
    );
  }

  // Aplica filtro de classe
  const posicoesVisiveis = filtro === 'todos'
    ? posicoes
    : posicoes.filter((p) => {
        const f = FILTROS.find((x) => x.id === filtro);
        return f?.classes.includes(p.classeAtivo);
      });

  // Cálculos de totais
  let totalCusto = 0;
  let totalMercado = 0;
  let totalMercadoDisponivel = true;

  for (const p of posicoesVisiveis) {
    totalCusto += p.custoTotalEmCentavos;
    const cot = cotacoes[p.ticker];
    if (cot && cot.preco > 0) {
      totalMercado += cot.preco * p.quantidade * 100; // em centavos
    } else {
      totalMercadoDisponivel = false;
    }
  }

  const totalResultadoCentavos = totalMercadoDisponivel ? totalMercado - totalCusto : 0;
  const totalResultadoPct = totalCusto > 0 && totalMercadoDisponivel
    ? ((totalMercado - totalCusto) / totalCusto) * 100
    : null;

  return (
    <div className="space-y-3">
      {/* Barra de filtros + refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {FILTROS.map((f) => {
            const count = f.id === 'todos'
              ? posicoes.length
              : posicoes.filter((p) => f.classes.includes(p.classeAtivo)).length;
            if (count === 0 && f.id !== 'todos') return null;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filtro === f.id
                    ? 'bg-svn-carbon text-white border-svn-carbon'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {f.label} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {ultimaAtt && !loadingCot && (
            <span className="text-[11px] text-slate-400">
              Cotações: {ultimaAtt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {erroApi && (
            <span className="text-[11px] text-amber-600">Cotações indisponíveis</span>
          )}
          <button
            onClick={fetchCotacoes}
            disabled={loadingCot}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-svn-ruby disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={11} className={loadingCot ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 text-left border-b border-slate-200">
              <th className="px-4 py-2.5 font-medium">Ativo</th>
              <th className="px-4 py-2.5 font-medium text-right">Qtd</th>
              <th className="px-4 py-2.5 font-medium text-right">PM</th>
              <th className="px-4 py-2.5 font-medium text-right">Custo Total</th>
              <th className="px-4 py-2.5 font-medium text-right">Preço Atual</th>
              <th className="px-4 py-2.5 font-medium text-right">Valor de Mercado</th>
              <th className="px-4 py-2.5 font-medium text-right">Resultado</th>
              <th className="px-4 py-2.5 font-medium text-right">Var. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {posicoesVisiveis
              .sort((a, b) => b.custoTotalEmCentavos - a.custoTotalEmCentavos)
              .map((p) => {
                const cot = cotacoes[p.ticker];
                const valorMercadoCentavos = cot && cot.preco > 0
                  ? Math.round(cot.preco * p.quantidade * 100)
                  : null;
                const resultadoCentavos = valorMercadoCentavos !== null
                  ? valorMercadoCentavos - p.custoTotalEmCentavos
                  : null;
                const resultadoPct = resultadoCentavos !== null && p.custoTotalEmCentavos > 0
                  ? (resultadoCentavos / p.custoTotalEmCentavos) * 100
                  : null;

                const resultadoCls = resultadoCentavos === null
                  ? ''
                  : resultadoCentavos >= 0
                    ? 'text-emerald-700 font-medium'
                    : 'text-svn-ruby font-medium';

                const classeCls = CLASSE_CLS[p.classeAtivo] ?? 'bg-slate-100 text-slate-500';
                const classeLabel = CLASSE_LABEL[p.classeAtivo] ?? p.classeAtivo;

                return (
                  <tr key={p.ticker} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800 text-sm">
                          {p.ticker}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${classeCls}`}>
                          {classeLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 font-mono">
                      {p.quantidade.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 font-mono">
                      {brl(p.pmEmCentavos)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 font-mono">
                      {brl(p.custoTotalEmCentavos)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {loadingCot
                        ? <Skeleton />
                        : cot && cot.preco > 0
                          ? <span className="text-slate-700">{brl(Math.round(cot.preco * 100))}</span>
                          : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {loadingCot
                        ? <Skeleton />
                        : valorMercadoCentavos !== null
                          ? <span className="text-slate-700">{brl(valorMercadoCentavos)}</span>
                          : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {loadingCot
                        ? <Skeleton />
                        : resultadoCentavos !== null
                          ? <span className={resultadoCls}>{brl(Math.abs(resultadoCentavos))}</span>
                          : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {loadingCot
                        ? <Skeleton />
                        : resultadoPct !== null
                          ? (
                            <span className={`flex items-center justify-end gap-0.5 text-xs font-medium ${resultadoPct >= 0 ? 'text-emerald-600' : 'text-svn-ruby'}`}>
                              {resultadoPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {pct(resultadoPct)}
                            </span>
                          )
                          : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
          </tbody>

          {/* Linha de totais */}
          {posicoesVisiveis.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-medium text-sm">
                <td className="px-4 py-2.5 text-slate-600 text-xs uppercase tracking-wide">
                  Total ({posicoesVisiveis.length} ativos)
                </td>
                <td />
                <td />
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                  {brl(totalCusto)}
                </td>
                <td />
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                  {loadingCot
                    ? <Skeleton />
                    : totalMercadoDisponivel
                      ? brl(totalMercado)
                      : <span className="text-slate-400 font-normal text-xs">parcial</span>
                  }
                </td>
                <td className={`px-4 py-2.5 text-right font-mono ${totalResultadoCentavos >= 0 ? 'text-emerald-700' : 'text-svn-ruby'}`}>
                  {loadingCot
                    ? <Skeleton />
                    : totalMercadoDisponivel
                      ? brl(Math.abs(totalResultadoCentavos))
                      : <span className="text-slate-400 font-normal text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!loadingCot && totalResultadoPct !== null && (
                    <span className={`text-xs font-semibold ${totalResultadoPct >= 0 ? 'text-emerald-600' : 'text-svn-ruby'}`}>
                      {pct(totalResultadoPct)}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-[11px] text-slate-400">
        Preços via brapi.dev · PM = preço médio de aquisição calculado sobre todas as notas importadas
      </p>
    </div>
  );
}
