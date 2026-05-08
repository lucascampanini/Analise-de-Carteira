'use client';

const FIELD_LABELS: Record<string, string> = {
  dataPregao:    'Data do Pregão (YYYY-MM-DD)',
  nrNota:        'Número da Nota',
  cnpjCorretora: 'CNPJ da Corretora',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  dataPregao:    '2024-04-15',
  nrNota:        '12345678',
  cnpjCorretora: '02.332.886/0001-04',
};

interface Props {
  camposFaltando: string[];
  corrections: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onConfirm: () => void;
}

export function NotaRevisaoForm({ camposFaltando, corrections, onChange, onConfirm }: Props) {
  const fixable  = camposFaltando.filter((f) => f in FIELD_LABELS);
  const critical = camposFaltando.includes('operacoes');
  const canConfirm = fixable.every((f) => corrections[f]?.trim());

  if (critical) {
    return (
      <p className="text-xs text-svn-ruby mt-2">
        Nenhuma operação extraída — esta nota não pode ser importada automaticamente.
        Verifique se o PDF é uma nota de corretagem Sinacor válida.
      </p>
    );
  }

  if (fixable.length === 0) {
    return (
      <p className="text-xs text-amber-600 mt-2">
        Resumo financeiro incompleto mas operações presentes — pode importar.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {fixable.map((field) => (
        <div key={field}>
          <label className="block text-xs text-slate-500 mb-0.5">
            {FIELD_LABELS[field]}
          </label>
          <input
            type="text"
            value={corrections[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[field]}
            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-svn-ruby"
          />
        </div>
      ))}
      <button
        onClick={onConfirm}
        disabled={!canConfirm}
        className="mt-1 px-3 py-1 text-xs bg-svn-carbon text-white rounded disabled:opacity-40 hover:bg-[#2e2420] transition-colors"
      >
        Confirmar correções
      </button>
    </div>
  );
}
