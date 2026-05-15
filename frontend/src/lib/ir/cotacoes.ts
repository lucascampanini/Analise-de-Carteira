'use client';
// Busca cotações atuais em batch via brapi.dev.
// Usado pelo módulo IR para calcular resultado não realizado das posições.
// Token configurado em NEXT_PUBLIC_BRAPI_TOKEN (opcional — free tier sem token).

export interface Cotacao {
  preco: number;        // preço atual em reais
  variacaoDia: number;  // variação percentual do dia
  nome: string;         // nome do ativo
}

const BRAPI_BASE = 'https://brapi.dev/api/quote';

// Máximo de tickers por requisição brapi (free: ~50 funciona bem)
const BATCH_SIZE = 50;

async function fetchLote(tickers: string[]): Promise<Record<string, Cotacao>> {
  const token = process.env.NEXT_PUBLIC_BRAPI_TOKEN;
  const params = token ? `?token=${token}` : '';
  const url = `${BRAPI_BASE}/${tickers.join(',')}${params}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json() as {
      results?: Array<{
        symbol: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
        longName?: string;
        shortName?: string;
      }>;
    };

    const out: Record<string, Cotacao> = {};
    for (const item of json.results ?? []) {
      if (!item.symbol) continue;
      out[item.symbol] = {
        preco: item.regularMarketPrice ?? 0,
        variacaoDia: item.regularMarketChangePercent ?? 0,
        nome: item.longName ?? item.shortName ?? item.symbol,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Busca cotações atuais para uma lista de tickers B3.
 * Divide em lotes para respeitar limite da API.
 * Retorna objeto vazio para tickers sem cotação disponível (BDRs raros, etc.).
 */
export async function buscarCotacoes(
  tickers: string[],
): Promise<Record<string, Cotacao>> {
  if (!tickers.length) return {};

  const result: Record<string, Cotacao> = {};
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const lote = tickers.slice(i, i + BATCH_SIZE);
    const parcial = await fetchLote(lote);
    Object.assign(result, parcial);
  }
  return result;
}
