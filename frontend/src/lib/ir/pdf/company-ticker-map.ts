'use client';
// Mapeamento: abreviação do nome da empresa → base do ticker B3 (sem sufixo numérico).
// Usado pelo parser Sinacor quando notas XP 2025+ omitem o código B3 e mostram
// apenas o nome da empresa (ex: "MINERVA ON NM" em vez de "BEEF3 MINERVA ON NM").

const EMPRESA_BASE: Readonly<Record<string, string>> = {
  // ── Bancos ────────────────────────────────────────────────────────────────
  'BRASIL':      'BBAS',   // Banco do Brasil
  'ITAU':        'ITUB',
  'ITAÚ':        'ITUB',
  'BRADESCO':    'BBDC',
  'SANTANDER':   'SANB',
  'ABC':         'ABCB',
  'BANRISUL':    'BRSR',
  'BTG':         'BPAC',
  'INTER':       'INBR',
  'PINE':        'PINE',
  'DAYCOVAL':    'DAYC',
  'INDUSVAL':    'IDVL',

  // ── Energia ───────────────────────────────────────────────────────────────
  'PETROBRAS':   'PETR',
  'PETRO':       'PETR',
  'EQUATORIAL':  'EQTL',
  'CEMIG':       'CMIG',
  'COPEL':       'CPLE',
  'CPFL':        'CPFE',
  'ELETROBRAS':  'ELET',
  'ELETROBRÁS':  'ELET',
  'ENEVA':       'ENEV',
  'ENGIE':       'EGIE',
  'AUREN':       'AURE',
  'NEOENERGIA':  'NEOE',

  // ── Mineração e Siderurgia ────────────────────────────────────────────────
  'VALE':        'VALE',
  'CSN':         'CSNA',
  'USIMINAS':    'USIM',
  'GERDAU':      'GGBR',
  'METALURGICA': 'GOAU',
  'METALÚRGICA': 'GOAU',
  'BRADESPAR':   'BRAP',

  // ── Agro e Alimentos ──────────────────────────────────────────────────────
  'MINERVA':     'BEEF',
  'JBS':         'JBSS',
  'BRF':         'BRFS',
  'CAMIL':       'CAML',
  'MARFRIG':     'MRFG',

  // ── Varejo ────────────────────────────────────────────────────────────────
  'MAGAZINE':    'MGLU',
  'MAGAZ':       'MGLU',   // abreviação de Magazine Luiza
  'CASAS':       'BHIA',   // Casas Bahia
  'AMERICANAS':  'AMER',
  'RENNER':      'LREN',
  'AREZZO':      'ARZZ',
  'SOMA':        'SOMA',
  'VIVARA':      'VIVA',
  'ALIANSCE':    'ALSO',
  'PETZ':        'PETZ',

  // ── Tecnologia e Fintech ──────────────────────────────────────────────────
  'TOTVS':       'TOTS',
  'LWSA':        'LWSA',
  'LOCAWEB':     'LWSA',
  'CIELO':       'CIEL',
  'POSITIVO':    'POSI',
  'INTELBRAS':   'INTB',
  'BEMOBI':      'BMOB',

  // ── Telecom ───────────────────────────────────────────────────────────────
  'TIM':         'TIMS',
  'VIVO':        'VIVT',

  // ── Saúde ─────────────────────────────────────────────────────────────────
  'HAPVIDA':     'HAPV',
  'FLEURY':      'FLRY',
  'DASA':        'DASA',
  'HYPERA':      'HYPE',
  'HERMES':      'HYPE',   // Hermes Pardini (incorporada pela Fleury)
  'RAIA':        'RADL',
  'BLAU':        'BLAU',
  'ONCOCLINI':   'ONCO',

  // ── Imóveis ───────────────────────────────────────────────────────────────
  'CYRELA':      'CYRE',
  'MRV':         'MRVE',
  'GAFISA':      'GFSA',
  'EZTEC':       'EZTC',
  'TENDA':       'TEND',
  'DIRECIONAL':  'DIRR',
  'EVEN':        'EVEN',

  // ── Financeiro não-bancário ────────────────────────────────────────────────
  'B3':          'B3SA',
  'CVC':         'CVCB',
  'PORTO':       'PSSA',
  'SBF':         'SBFG',   // Centauro (SBF Group)

  // ── Logística e Transporte ────────────────────────────────────────────────
  'RUMO':        'RAIL',
  'EMBRAER':     'EMBR',
  'GOL':         'GOLL',
  'AZUL':        'AZUL',
  'SIMPAR':      'SIMH',
  'JSL':         'JSLG',

  // ── Utilities ─────────────────────────────────────────────────────────────
  'SABESP':      'SBSP',
  'SANEPAR':     'SAPR',
  'COSAN':       'CSAN',
  'VIBRA':       'VBBR',   // Vibra Energia (ex-BR Distribuidora)

  // ── Industriais ───────────────────────────────────────────────────────────
  'WEG':         'WEGE',
  'RANDON':      'RAPT',
  'MARCOPOLO':   'POMO',
  'TUPY':        'TUPY',

  // ── Papel e Celulose ──────────────────────────────────────────────────────
  'KLABIN':      'KLBN',
  'SUZANO':      'SUZB',

  // ── Construção / Materiais ────────────────────────────────────────────────
  'DEXCO':       'DXCO',
  'DURATEX':     'DXCO',

  // ── Alimentos e Bebidas ───────────────────────────────────────────────────
  'AMBEV':       'ABEV',
  'NATURA':      'NTCO',

  // ── Educação ──────────────────────────────────────────────────────────────
  'COGNA':       'COGN',
  'YDUQS':       'YDUQ',
  'ANIMA':       'ANIM',

  // ── Seguros ───────────────────────────────────────────────────────────────
  'BBSEGURI':    'BBSE',
};

// Série descritora → sufixo numérico do ticker B3
const SERIE_SUFIXO: Array<[RegExp, string]> = [
  [/\bUNIT\b|\bUNT\b/i,  '11'],
  [/\bCI\b/i,             '11'],  // Cota de FII/ETF
  [/\bPNB\b/i,             '6'],
  [/\bPNA\b/i,             '5'],
  [/\bPN\b/i,              '4'],
  [/\bON\b|\bORD\b/i,      '3'],
];

/**
 * Tenta resolver um ticker B3 a partir do nome/abreviação da empresa e da
 * descrição completa do título (como aparece nas notas XP 2025+).
 *
 * Exemplos:
 *   resolveTickerFromDescription('MINERVA', 'MINERVA ON NM @')   → 'BEEF3'
 *   resolveTickerFromDescription('PETROBRAS', 'PETROBRAS PN EJ @') → 'PETR4'
 *   resolveTickerFromDescription('WEG', 'WEG ON NM @')            → 'WEGE3'
 *   resolveTickerFromDescription('FII', 'FII XPML MAXI RETAIL @') → 'XPML11'
 *
 * @returns  Ticker B3 resolvido ou null se não identificado
 */
export function resolveTickerFromDescription(
  firstToken: string,
  middle: string,
): string | null {
  const token = firstToken.toUpperCase();
  // Remove tudo a partir do "@" (marcador que separa descrição das colunas de qty)
  const desc = middle.replace(/@.*$/, '').toUpperCase();

  // Caso especial: "FII <abrev> ..." → tenta "<abrev>11"
  if (token === 'FII' || token === 'ETF') {
    const tokens = desc.trim().split(/\s+/);
    if (tokens.length >= 2) {
      const candidate = tokens[1] + '11';
      if (/^[A-Z]{2,6}11$/.test(candidate)) return candidate;
    }
    return null;
  }

  const base = EMPRESA_BASE[token];
  if (!base) return null;

  for (const [pat, suf] of SERIE_SUFIXO) {
    if (pat.test(desc)) return base + suf;
  }

  // Padrão: ON → sufixo 3
  return base + '3';
}
