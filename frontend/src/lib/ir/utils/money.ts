// Todas as operações monetárias em CENTAVOS INTEIROS (nunca float).
// Razão: float IEEE 754 acumula erros em cálculos de PM e apuração fiscal.
// Conversão para reais ocorre APENAS na camada de apresentação.
//
// Fonte: docs/13-resultado-acoes-ir/04-compensacao-prejuizo/ seção 9.3
// e docs/13-resultado-acoes-ir/07-analise-gaps-bloqueadores/ gap A3

/** Converte reais (float da UI/PDF) para centavos inteiros. */
export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/** Converte centavos inteiros para reais (apenas para exibição). */
export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

/** Formata centavos como string BRL para exibição. Ex: 150075 → "R$ 1.500,75" */
export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

/** Formata centavos como string numérica sem símbolo. Ex: 150075 → "1.500,75" */
export function formatBRLNumero(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/**
 * Parseia string monetária brasileira para centavos inteiros.
 * Aceita: "1.500,75", "R$ 1.500,75", "1500.75", "1500,75"
 */
export function parseBRLParaCentavos(str: string): number {
  // Remove símbolo, espaços e pontos de milhar; substitui vírgula decimal por ponto
  const limpo = str
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const valor = parseFloat(limpo);
  if (isNaN(valor)) return 0;
  return Math.round(valor * 100);
}

/**
 * Soma segura de centavos inteiros (sem risco de float).
 * Usar no lugar de Array.reduce com soma de valores.
 */
export function somarCentavos(...valores: number[]): number {
  return valores.reduce((acc, v) => acc + Math.round(v), 0);
}

/**
 * Multiplica centavos por uma alíquota decimal e retorna centavos inteiros.
 * Ex: calcularIR(300000, 0.15) → 45000 (R$450,00 de IR sobre R$3.000,00)
 */
export function aplicarAliquota(centavos: number, aliquota: number): number {
  return Math.round(centavos * aliquota);
}

/**
 * Calcula o novo preço médio ponderado em centavos.
 * Garante que a divisão é feita com precisão máxima antes de arredondar.
 *
 * @param custoTotalAnteriorCentavos - custo total acumulado antes desta compra
 * @param novaQuantidade - quantidade total após a compra
 * @returns PM em centavos inteiros por ação
 */
export function calcularPM(
  custoTotalAnteriorCentavos: number,
  novaQuantidade: number,
): number {
  if (novaQuantidade <= 0) return 0;
  return Math.round(custoTotalAnteriorCentavos / novaQuantidade);
}

/** Retorna true se o valor em centavos corresponde a zero reais. */
export function isZero(centavos: number): boolean {
  return centavos === 0;
}

/** Garante que o valor não seja negativo (útil para custo total após venda). */
export function naoNegativo(centavos: number): number {
  return Math.max(0, centavos);
}
