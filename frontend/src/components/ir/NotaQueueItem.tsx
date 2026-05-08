'use client';
import { useState } from 'react';
import { NotaRevisaoForm } from './NotaRevisaoForm';
import type { ParsedNotaResult } from '@/lib/ir/types/parsed-nota';

export type ItemStatus =
  | 'parsing' | 'needs_review' | 'ready' | 'saving' | 'done' | 'error' | 'skipped';

const STATUS_BADGE: Record<ItemStatus, { label: string; cls: string }> = {
  parsing:      { label: 'Processando…', cls: 'bg-blue-100 text-blue-700 animate-pulse' },
  needs_review: { label: 'Revisar',       cls: 'bg-amber-100 text-amber-700' },
  ready:        { label: 'Pronto',        cls: 'bg-emerald-100 text-emerald-700' },
  saving:       { label: 'Salvando…',    cls: 'bg-blue-100 text-blue-700' },
  done:         { label: 'Importado',    cls: 'bg-emerald-200 text-emerald-800' },
  error:        { label: 'Erro',         cls: 'bg-red-100 text-svn-ruby' },
  skipped:      { label: 'Duplicada',    cls: 'bg-slate-100 text-slate-500' },
};

const QUALITY_BADGE: Record<string, { label: string; cls: string }> = {
  ALTA:   { label: 'ALTA',   cls: 'bg-emerald-50 text-emerald-600' },
  MEDIA:  { label: 'MÉDIA',  cls: 'bg-amber-50 text-amber-600' },
  BAIXA:  { label: 'BAIXA',  cls: 'bg-red-50 text-svn-ruby' },
  IMAGEM: { label: 'IMAGEM', cls: 'bg-slate-100 text-slate-500' },
};

interface Props {
  fileName: string;
  status: ItemStatus;
  parsed?: ParsedNotaResult;
  error?: string;
  isDuplicate: boolean;
  corrections: Record<string, string>;
  onRetry: () => void;
  onCorrection: (field: string, value: string) => void;
  onConfirmar: () => void;
}

export function NotaQueueItem({
  fileName, status, parsed, error, isDuplicate,
  corrections, onRetry, onCorrection, onConfirmar,
}: Props) {
  const [expanded, setExpanded] = useState(status === 'needs_review');
  const sb = STATUS_BADGE[status];
  const qb = parsed ? QUALITY_BADGE[parsed.qualidade] : null;

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${
      status === 'done'    ? 'border-emerald-200 bg-emerald-50/40' :
      status === 'error'   ? 'border-red-200 bg-red-50/40' :
      status === 'skipped' ? 'border-slate-200 bg-slate-50' :
      'border-slate-200 bg-white'
    }`}>
      {/* Linha principal */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-xs text-slate-500 truncate max-w-[180px]" title={fileName}>
          {fileName}
        </span>

        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sb.cls}`}>
          {sb.label}
        </span>

        {qb && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${qb.cls}`}>
            {qb.label}
          </span>
        )}

        {parsed && (
          <span className="text-xs text-slate-400">
            {parsed.dataPregao || '—'} · {parsed.operacoes.length} op
          </span>
        )}

        <div className="ml-auto flex gap-1.5">
          {status === 'error' && !isDuplicate && (
            <button
              onClick={onRetry}
              className="text-[11px] text-svn-ruby underline"
            >
              Tentar novamente
            </button>
          )}
          {status === 'needs_review' && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] text-slate-500 underline"
            >
              {expanded ? 'Fechar' : 'Revisar'}
            </button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <p className="text-xs text-svn-ruby mt-1">{error}</p>
      )}

      {/* Avisos do parser */}
      {parsed?.avisos.length ? (
        <ul className="mt-1 space-y-0.5">
          {parsed.avisos.map((a, i) => (
            <li key={i} className="text-[11px] text-amber-600">⚠ {a}</li>
          ))}
        </ul>
      ) : null}

      {/* Formulário de revisão */}
      {expanded && parsed && status === 'needs_review' && (
        <NotaRevisaoForm
          camposFaltando={parsed.camposFaltando}
          corrections={corrections}
          onChange={onCorrection}
          onConfirm={onConfirmar}
        />
      )}
    </div>
  );
}
