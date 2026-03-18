export const brl = (v?: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const pct = (v?: number | null) =>
  v == null ? "—" : `${v.toFixed(1)}%`;

export const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export const diasAte = (s?: string | null): number => {
  if (!s) return 999;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
};

export const urgenciaCor = (dias: number) => {
  if (dias < 0)  return "text-gray-400";
  if (dias <= 30) return "text-red-600 font-semibold";
  if (dias <= 90) return "text-amber-600 font-semibold";
  return "text-green-700";
};

export const urgenciaBg = (dias: number) => {
  if (dias <= 30) return "bg-red-50 border-red-200";
  if (dias <= 90) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
};
