'use client';
// Mapeamento: abreviação do nome da empresa → base do ticker B3 (sem sufixo numérico).
// Usado pelo parser Sinacor quando notas XP 2025+ omitem o código B3 e mostram
// apenas o nome/abreviação da empresa (ex: "MINERVA ON NM" em vez de "BEEF3 MINERVA ON NM").
//
// Cobertura: Ibovespa, IBRX-100, BDRs comuns, variações de nome.

const EMPRESA_BASE: Readonly<Record<string, string>> = {

  // ── Bancos e Serviços Financeiros ─────────────────────────────────────────
  'BANCO DO BRASIL':  'BBAS',
  'BRASIL':           'BBAS',
  'BB':               'BBAS',
  'ITAU':             'ITUB',
  'ITAÚ':             'ITUB',
  'ITAU UNIBANCO':    'ITUB',
  'ITAÚ UNIBANCO':    'ITUB',
  'BRADESCO':         'BBDC',
  'BRADESCO SEGUROS': 'BBDC',
  'SANTANDER':        'SANB',
  'SANTANDER BR':     'SANB',
  'SANTANDER BRASIL': 'SANB',
  'ABC':              'ABCB',
  'ABC BRASIL':       'ABCB',
  'BANRISUL':         'BRSR',
  'BTG':              'BPAC',
  'BTG PACTUAL':      'BPAC',
  'INTER':            'INBR',
  'BANCO INTER':      'INBR',
  'PINE':             'PINE',
  'BANCO PINE':       'PINE',
  'DAYCOVAL':         'DAYC',
  'BANCO DAYCOVAL':   'DAYC',
  'INDUSVAL':         'IDVL',
  'BANCO INDUSVAL':   'IDVL',
  'BMG':              'BMGB',
  'BANCO BMG':        'BMGB',
  'BANPARA':          'BPAR',
  'BANESE':           'BGIP',
  'PARANA BANCO':     'PRBC',
  'PARANA':           'PRBC',
  'B3':               'B3SA',
  'IRBR':             'IRBR',
  'IRB BRASIL':       'IRBR',
  'IRB':              'IRBR',
  'PORTO':            'PSSA',
  'PORTO SEGURO':     'PSSA',
  'BB SEGURIDADE':    'BBSE',
  'BBSEGURI':         'BBSE',
  'CIELO':            'CIEL',
  'GETNET':           'GETT',
  'NUBANK':           'NUBR',   // BDR NUBR31
  'NU':               'NUBR',
  'XP INC':           'XPBR',   // BDR XPBR31
  'PAGSEGURO':        'PAGS',   // BDR PAGS34
  'PAGS':             'PAGS',
  'STONE':            'STOC',   // BDR STOC31
  'TOTVS':            'TOTS',

  // ── Energia Elétrica ─────────────────────────────────────────────────────
  'EQUATORIAL':       'EQTL',
  'EQUATORIAL ENERGIA':'EQTL',
  'CEMIG':            'CMIG',
  'COPEL':            'CPLE',
  'CPFL':             'CPFE',
  'CPFL ENERGIA':     'CPFE',
  'ELETROBRAS':       'ELET',
  'ELETROBRÁS':       'ELET',
  'ENEVA':            'ENEV',
  'ENGIE':            'EGIE',
  'ENGIE BRASIL':     'EGIE',
  'AUREN':            'AURE',
  'AUREN ENERGIA':    'AURE',
  'NEOENERGIA':       'NEOE',
  'NEO ENERGIA':      'NEOE',
  'TAESA':            'TAEE',   // TAEE11 (Unit)
  'OMEGA':            'OMGE',
  'OMEGA ENERGIA':    'OMGE',
  'ISA ENERGIA':      'ISAE',   // ex-Isa Cteep / TRPL
  'ISA CTEEP':        'ISAE',
  'CESP':             'CESP',
  'AES BRASIL':       'AESB',
  'AES':              'AESB',
  'LIGHT':            'LIGT',
  'ENERGIAS BR':      'ENBR',
  'EDP BRASIL':       'ENBR',
  'EDP':              'ENBR',
  'STATKRAFT':        'SKRT',   // nova, pode mudar
  'ELECTROBRAS':      'ELET',   // variação ortográfica

  // ── Petróleo, Gás e Combustíveis ──────────────────────────────────────────
  'PETROBRAS':        'PETR',
  'PETRO':            'PETR',
  'PRIO':             'PRIO',   // ex-PetroRio
  'PETRIO':           'PRIO',
  'PETRORIO':         'PRIO',
  '3R PETROLEUM':     'RRRP',
  'RRRP':             'RRRP',
  'VIBRA':            'VBBR',   // ex-BR Distribuidora
  'VIBRA ENERGIA':    'VBBR',
  'BR DISTRIBUIDORA': 'VBBR',
  'COSAN':            'CSAN',
  'RAIZEN':           'RAIZ',
  'RAÍZEN':           'RAIZ',
  'ULTRAPAR':         'UGPA',
  'ULTRA':            'UGPA',
  'IPIRANGA':         'UGPA',   // subsidiária Ultrapar
  'ENAUTA':           'ENAT',
  'KAROON':           'RECV',   // Karoon Energy → RECV3
  'RECV':             'RECV',

  // ── Mineração e Siderurgia ────────────────────────────────────────────────
  'VALE':             'VALE',
  'CSN':              'CSNA',
  'CSN MINERACAO':    'CMIN',
  'CSN MINERAÇÃO':    'CMIN',
  'CMIN':             'CMIN',
  'USIMINAS':         'USIM',
  'GERDAU':           'GGBR',
  'METALURGICA':      'GOAU',   // Metalúrgica Gerdau
  'METALÚRGICA':      'GOAU',
  'METALURGICA GERDAU':'GOAU',
  'BRADESPAR':        'BRAP',
  'FERBASA':          'FESA',
  'COTEMINAS':        'CTNM',
  'TERNIUM':          'TXRX',   // pode variar
  'ACOS VILLARES':    'VLLP',
  'VILLARES':         'VLLP',

  // ── Papel, Celulose e Florestal ────────────────────────────────────────────
  'KLABIN':           'KLBN',
  'SUZANO':           'SUZB',
  'IRANI':            'RANI',
  'CELULOSE IRANI':   'RANI',
  'MELHORAMENTOS':    'MSPA',

  // ── Químicos, Petroquímicos e Fertilizantes ────────────────────────────────
  'BRASKEM':          'BRKM',
  'UNIPAR':           'UNIP',
  'UNIPAR CARBOCLORO':'UNIP',
  'HERINGER':         'FHER',
  'FERTILIZANTES HERINGER':'FHER',
  'MOSAIC':           'MOSI',   // Mosaic Fertilizantes
  'NUTRIPLANT':       'NUTR',
  'ELECTROQUIMICA':   'ELQU',

  // ── Agro e Alimentos ──────────────────────────────────────────────────────
  'MINERVA':          'BEEF',
  'MINERVA FOODS':    'BEEF',
  'JBS':              'JBSS',
  'BRF':              'BRFS',
  'MARFRIG':          'MRFG',
  'CAMIL':            'CAML',
  'SLC':              'SLCE',
  'SLC AGRICOLA':     'SLCE',
  'SLC AGRÍCOLA':     'SLCE',
  'SAO MARTINHO':     'SMTO',
  'SÃO MARTINHO':     'SMTO',
  'BRASIL AGRO':      'AGRO',
  'AGRO':             'AGRO',
  'TERRA SANTA':      'TASA',
  'KEPLER WEBER':     'KEPL',
  'KEPLER':           'KEPL',
  'BIOSEV':           'BSEV',
  'COSAN LOG':        'RLOG',
  'JALLES':           'JALL',
  'JALLES MACHADO':   'JALL',
  'TRES TENTOS':      'TTEN',
  'TRÊS TENTOS':      'TTEN',

  // ── Construção Civil e Incorporação ───────────────────────────────────────
  'CYRELA':           'CYRE',
  'MRV':              'MRVE',
  'GAFISA':           'GFSA',
  'EZTEC':            'EZTC',
  'TENDA':            'TEND',
  'DIRECIONAL':       'DIRR',
  'EVEN':             'EVEN',
  'LAVVI':            'LAVV',
  'PLANO E PLANO':    'PLPL',
  'PLPL':             'PLPL',
  'HELBOR':           'HBOR',
  'TECNISA':          'TCSA',
  'TRISUL':           'TRIS',
  'PDG':              'PDGR',   // PDG Realty
  'EZS':              'CYRE',   // Cyrela variação?
  'INPAR':            'INPR',
  'CONSTRUTORA SULTEPA':'SULT',

  // ── Shoppings e Fundos Imobiliários de Gestora ────────────────────────────
  'MULTIPLAN':        'MULT',
  'ALIANSCE':         'ALSO',
  'ALIANSCE SONAE':   'ALSO',
  'IGUATEMI':         'IGTI',   // IGTI11 (Unit)
  'BRPR':             'BRPR',
  'BR PROPERTIES':    'BRPR',
  'LOG CP':           'LOGG',
  'LOG':              'LOGG',
  'ATIVO':            'BRIO',   // BR Investimentos

  // ── Varejo e Consumo ──────────────────────────────────────────────────────
  'MAGAZINE':         'MGLU',
  'MAGAZ':            'MGLU',
  'MAGAZINE LUIZA':   'MGLU',
  'CASAS':            'BHIA',   // Casas Bahia (ex-Via Varejo)
  'CASAS BAHIA':      'BHIA',
  'VIA':              'VIIA',   // Via Varejo / VIIA3 → BHIA3
  'VIA VAREJO':       'BHIA',
  'AMERICANAS':       'AMER',
  'LOJAS AMERICANAS': 'AMER',
  'RENNER':           'LREN',
  'LOJAS RENNER':     'LREN',
  'QUERO QUERO':      'LJQQ',
  'LOJAS QUERO QUERO':'LJQQ',
  'LOJAS':            'LREN',   // default Renner quando sem complemento
  'GPA':              'PCAR',   // Grupo Pão de Açúcar
  'CBD':              'PCAR',
  'PAO DE ACUCAR':    'PCAR',
  'PÃO DE AÇÚCAR':    'PCAR',
  'COMPANHIA BRASILEIRA':'PCAR',
  'ASSAI':            'ASAI',
  'SENDAS':           'ASAI',
  'ATACADAO':         'CRFB',
  'ATACADÃO':         'CRFB',
  'CARREFOUR':        'CRFB',
  'GRUPO CARREFOUR':  'CRFB',
  'BIG':              'BIGC',   // Big Grupos / ex-Walmart Brasil
  'HAVAN':            'HAVA',   // ainda privada? pode aparecer
  'CENCOSUD':         'CNCD',
  'GRUPO MATEUS':     'GMAT',
  'MATEUS':           'GMAT',
  'SMARTFIT':         'SMFT',
  'SMART FIT':        'SMFT',
  'CENTAURO':         'SBFG',
  'SBF':              'SBFG',
  'SBF GROUP':        'SBFG',
  'PETZ':             'PETZ',
  'UNIAO PET':        'AUAU',
  'UNIÃO PET':        'AUAU',
  'COBASI':           'COBA',
  'PET CENTER COMQUISTA': 'PETC', // pode variar
  'VIVARA':           'VIVA',
  'AREZZO':           'ARZZ',
  'AREZZO CO':        'ARZZ',
  'SOMA':             'SOMA',
  'GRUPO SOMA':       'SOMA',
  'ALPARGATAS':       'ALPA',
  'HERING':           'HGTX',
  'CIA HERING':       'HGTX',
  'GRENDENE':         'GRND',
  'VULCABRAS':        'VULC',
  'TRACK':            'TFCO',
  'TRACK FIELD':      'TFCO',
  'MOVIDA':           'MOVI',
  'LOCALIZA':         'RENT',
  'LOCALIZA HERTZ':   'RENT',
  'UNIDAS':           'LCAM',   // pré-fusão
  'VAMOS':            'VAMO',
  'SIMPAR':           'SIMH',
  'JSL':              'JSLG',
  'SEQUOIA':          'SEQL',
  'TEGMA':            'TGMA',
  'HIDROVIAS':        'HBSA',
  'HIDROVIAS BRASIL': 'HBSA',

  // ── Tecnologia e Telecom ──────────────────────────────────────────────────
  'LWSA':             'LWSA',
  'LOCAWEB':          'LWSA',
  'INTELBRAS':        'INTB',
  'POSITIVO':         'POSI',
  'BEMOBI':           'BMOB',
  'SINQIA':           'SQIA',
  'LINX':             'LINX',   // incorporada TOTVS
  'TIM':              'TIMS',
  'VIVO':             'VIVT',
  'TELEFONICA':       'VIVT',
  'TELEFÔNICA':       'VIVT',
  'OI':               'OIBR',
  'ALGAR TELECOM':    'ALGT',
  'ALGAR':            'ALGT',
  'DESKTOP':          'DESK',
  'BRISANET':         'BRIT',
  'UNIFIQUE':         'UFIQ',
  'ZENVIA':           'ZENV',
  'MELIUZ':           'CASH',   // Meliuz → CASH3
  'NEON':             'NEON',   // pode ser BDR
  'LIQTECH':          'LIQT',

  // ── Saúde ─────────────────────────────────────────────────────────────────
  'HAPVIDA':          'HAPV',
  'NOTREDAME':        'GNDI',   // incorporada Hapvida
  'NOTRE DAME':       'GNDI',
  'NDINTERMEDICA':    'GNDI',
  'FLEURY':           'FLRY',
  'HERMES PARDINI':   'PARD',
  'INSTITUTO HERMES': 'PARD',
  'PARDINI':          'PARD',   // incorporado Fleury
  'DASA':             'DASA',
  'REDE DOR':         'RDOR',
  "REDE D'OR":        'RDOR',
  'REDOR':            'RDOR',
  'MATER DEI':        'MATD',
  'HOSPITAL MATER DEI':'MATD',
  'VIVEO':            'VVEO',
  'HYPERA':           'HYPE',
  'HERMES':           'HYPE',   // Hermes Pardini ≠ contexto: usar PARD; Hypera → HYPE
  'RAIA DROGASIL':    'RADL',
  'RAIA':             'RADL',
  'DROGASIL':         'RADL',
  'PAGUE MENOS':      'PGMN',
  'PANVEL':           'PNVL',
  'PROFARMA':         'PFRM',
  'QUALICORP':        'QUAL',
  'ONCOCLINI':        'ONCO',
  'ONCOCLÍNICAS':     'ONCO',
  'BLAU':             'BLAU',
  'ESPAÇO LASER':     'ESPA',
  'ESPACOLASER':      'ESPA',
  'ORIZON':           'ORVR',   // Orizon Valorização de Resíduos

  // ── Educação ──────────────────────────────────────────────────────────────
  'COGNA':            'COGN',
  'YDUQS':            'YDUQ',
  'ANIMA':            'ANIM',
  'ANIMA HOLDING':    'ANIM',
  'CRUZEIRO DO SUL':  'CSED',
  'ESTACIO':          'YDUQ',   // incorporada Yduqs
  'BOSSA NOVA':       'BSML',
  'ELEVAR':           'LCAM',   // Unidas/Elevar

  // ── Logística e Transporte ────────────────────────────────────────────────
  'RUMO':             'RAIL',
  'EMBRAER':          'EMBR',
  'GOL':              'GOLL',
  'AZUL':             'AZUL',
  'LATAM':            'LATM',   // BDR LATM34
  'SANTOS BRASIL':    'STBP',
  'PORTOBELLO':       'PTBL',
  'CCR':              'CCRO',
  'ARTERIS':          'ARST',
  'ECORODOVIAS':      'ECOR',
  'JSL LOGISTICA':    'JSLG',
  'VAMOS LOCACAO':    'VAMO',

  // ── Utilidades Públicas (Saneamento) ──────────────────────────────────────
  'SABESP':           'SBSP',
  'SANEPAR':          'SAPR',
  'COPASA':           'CSMG',
  'SANEAMENTO BASICO':'SBSP',
  'ORIZON VALORIZ':   'ORVR',

  // ── Industriais e Bens de Capital ─────────────────────────────────────────
  'WEG':              'WEGE',
  'MARCOPOLO':        'POMO',
  'TUPY':             'TUPY',
  'MAHLE':            'MHLE',
  'MAHLE METAL LEVE': 'MHLE',
  'METAL LEVE':       'MHLE',
  'FRAS-LE':          'FRAS',
  'FRASLE':           'FRAS',
  'SCHULZ':           'SHUL',
  'IOCHPE':           'MYPK',
  'IOCHPE-MAXION':    'MYPK',
  'MAXION':           'MYPK',
  'PLASCAR':          'PLAS',
  'EMBRAER DEFESA':   'EMBR',
  'AEROMOT':          'ARMT',
  'COMGAS':           'CGAS',   // CGAS11 (Unit)
  'GAS BRASILIANO':   'GAZO',
  'AMBEV':            'ABEV',
  'DEXCO':            'DXCO',
  'DURATEX':          'DXCO',
  'CECRISA':          'CCRE',
  'ETERNIT':          'ETER',

  // ── Cosméticos, Higiene e Limpeza ─────────────────────────────────────────
  'NATURA':           'NTCO',
  'NATURA CO':        'NTCO',
  'BOTICARIO':        'BOTI',   // privada, mas pode aparecer
  'GRUPO BOTICARIO':  'BOTI',

  // ── Mídia e Entretenimento ────────────────────────────────────────────────
  'GLOBO':            'GLOB',
  'SBT':              'SBTI',
  'RECORD':           'RCRD',

  // ── Seguros e Previdência ─────────────────────────────────────────────────
  'IRBR RESSEGUROS':  'IRBR',
  'TOKIO MARINE':     'TKML',
  'SUS':              'IRBR',

  // ── BDRs — Empresas Internacionais ───────────────────────────────────────
  // Base do BDR no B3 geralmente é abreviação do ticker americano
  'APPLE':            'AAPL',   // AAPL34
  'TESLA':            'TSLA',   // TSLA34
  'MICROSOFT':        'MSFT',   // MSFT34
  'AMAZON':           'AMZO',   // AMZO34
  'NVIDIA':           'NVDC',   // NVDC34
  'ALPHABET':         'GOGL',   // GOGL34
  'GOOGLE':           'GOGL',   // GOGL34
  'META':             'M1TA',   // M1TA34
  'FACEBOOK':         'M1TA',   // antigo nome da Meta
  'NETFLIX':          'NFLX',   // NFLX34
  'VISA':             'VISA',   // VISA34
  'MASTERCARD':       'MSTC',   // MSTC34
  'JP MORGAN':        'JPMC',   // JPMC34
  'JPMORGAN':         'JPMC',
  'BERKSHIRE':        'BERK',   // BERK34
  'JOHNSON':          'JNJB',   // JNJB34
  'JOHNSON JOHNSON':  'JNJB',
  'DISNEY':           'DISB',   // DISB34
  'WALMART':          'WALM',   // WALM34
  'EXXON':            'EXXO',   // EXXO34
  'EXXONMOBIL':       'EXXO',
  'CHEVRON':          'CHVX',   // CHVX34
  'ABBOTT':           'ABTT',   // ABTT34
  'PAYPAL':           'PYPL',   // PYPL34
  'UBER':             'UBER',   // UBER34
  'AIRBNB':           'ABNB',   // ABNB34
  'PFIZER':           'PFIZ',   // PFIZ34
  'COCA-COLA':        'COCA',   // COCA34
  'COCA COLA':        'COCA',
  'PEPSI':            'PEPB',   // PEPB34
  'PEPSICO':          'PEPB',
  'MCDONALDS':        'MCDC',   // MCDC34
  'MC DONALDS':       'MCDC',
  'BOEING':           'BOED',   // BOED34
  'SALESFORCE':       'SSFO',   // SSFO34
  'ORACLE':           'ORCL',   // ORCL34
  'IBM':              'IBMB',   // IBMB34
  'INTEL':            'ITLC',   // ITLC34
  'AMD':              'A1MD',   // A1MD34
  'QUALCOMM':         'QCOM',   // QCOM34
  'BROADCOM':         'AVGO',   // AVGO34
  'TAIWAN SEMI':      'TSMC',   // TSMC34
  'TSMC':             'TSMC',
  'SAMSUNG':          'SMSB',   // SMSB34
  'FERRARI':          'FRRR',   // FRRR34
  'LVMH':             'LVMB',   // LVMB34
  'HERMES INTL':      'HRMS',   // HRMS34
  'BANCO SANTANDER SA':'XSOB',  // XSOB34 (espanhol)
  'SHOPIFY':          'SHOP',   // SHOP34
  'SNOWFLAKE':        'SNOW',   // SNOW34
  'PALANTIR':         'PLTR',   // PLTR34
  'COINBASE':         'COIN',   // COIN34
  'MERCADOLIBRE':     'MELI',   // MELI34
  'MERCADO LIVRE':    'MELI',
  'SPOTIFY':          'SPTI',   // SPTI34
  'TWITTER':          'TWTR',   // TWTR34 (delisted 2022, pode aparecer historicamente)

} as const;

// Série descritora → sufixo numérico do ticker B3
const SERIE_SUFIXO: Array<[RegExp, string]> = [
  [/\bUNIT\b|\bUNT\b/i,        '11'],
  [/\bCI\b/i,                   '11'],  // Cota de FII/ETF
  [/\bDRN\b|\bBDR\b/i,         '34'],  // Brazilian Depositary Receipt
  [/\bPNB\b/i,                   '6'],
  [/\bPNA\b/i,                   '5'],
  [/\bPN\b/i,                    '4'],
  [/\bON\b|\bORD\b/i,            '3'],
];

/**
 * Tenta resolver um ticker B3 a partir do nome/abreviação da empresa e da
 * descrição completa do título (como aparece nas notas XP 2025+).
 *
 * Exemplos:
 *   resolveTickerFromDescription('MINERVA',   'MINERVA ON NM @')          → 'BEEF3'
 *   resolveTickerFromDescription('PETROBRAS', 'PETROBRAS PN EJ @')        → 'PETR4'
 *   resolveTickerFromDescription('WEG',       'WEG ON NM @')              → 'WEGE3'
 *   resolveTickerFromDescription('FII',       'FII XPML MAXI RETAIL @')  → 'XPML11'
 *   resolveTickerFromDescription('APPLE',     'APPLE DRN @')              → 'AAPL34'
 *
 * @returns  Ticker B3 resolvido ou null se não identificado
 */
export function resolveTickerFromDescription(
  firstToken: string,
  middle: string,
): string | null {
  const token = firstToken.toUpperCase();
  // Remove tudo a partir do "@" (separador da parte quantitativa)
  const desc = middle.replace(/@.*$/, '').toUpperCase();

  // Caso especial: "FII <abrev> ..." ou "ETF <abrev> ..." → tenta "<abrev>11"
  if (token === 'FII' || token === 'ETF' || token === 'FIAGRO') {
    const tokens = desc.trim().split(/\s+/);
    if (tokens.length >= 2) {
      const candidate = tokens[1] + '11';
      if (/^[A-Z]{2,6}11$/.test(candidate)) return candidate;
    }
    return null;
  }

  const base = EMPRESA_BASE[token];
  if (!base) return null;

  // Determina sufixo pela série presente na descrição
  for (const [pat, suf] of SERIE_SUFIXO) {
    if (pat.test(desc)) return base + suf;
  }

  // Padrão: ON → sufixo 3
  return base + '3';
}
