'use client';
import { useCallback, useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { notaJaExiste, salvarNota } from '@/lib/ir/firestore';
import { recalcularPMCompleto } from '@/lib/ir/pm-calculator';
import { recalcularApuracoesCompleto } from '@/lib/ir/apuracao-mensal';
import { NotaQueueItem, type ItemStatus } from './NotaQueueItem';
import { ExtractionQuality } from '@/lib/ir/types/parsed-nota';
import { deveriaUsarServidorParser } from '@/lib/ir/server-parser';
import type { ParsedNotaResult } from '@/lib/ir/types/parsed-nota';

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  parsed?: ParsedNotaResult;
  error?: string;
  corrections: Record<string, string>;
  isDuplicate: boolean;
  qualidadeBaixa?: boolean; // true = parser browser falhou, oferecer servidor
}

interface Props {
  clienteId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export function UploadNotasModal({ clienteId, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [password, setPassword] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Parsing de um item individual ────────────────────────────────────────
  const parseItem = useCallback(async (itemId: string, file: File, pwd: string) => {
    setItems((prev) =>
      prev.map((i) => i.id === itemId ? { ...i, status: 'parsing', error: undefined } : i),
    );

    try {
      const buffer = await file.arrayBuffer();
      // Importação dinâmica — mantém pdfjs-dist fora do bundle principal
      const { parseSinacorNota } = await import('@/lib/ir/pdf/nota-parser');

      let parsed: ParsedNotaResult;
      try {
        parsed = await parseSinacorNota(buffer, { password: pwd || undefined });
      } catch (err: unknown) {
        const isPassErr = err instanceof Error && err.name === 'PasswordException';
        if (mountedRef.current) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    status: 'error',
                    error: isPassErr
                      ? 'PDF protegido — informe a senha e clique em "Tentar novamente"'
                      : 'Falha ao processar PDF',
                  }
                : i,
            ),
          );
        }
        return;
      }

      // Verifica duplicata só quando temos nrNota
      let isDuplicate = false;
      if (parsed.nrNota && user) {
        try {
          isDuplicate = await notaJaExiste(user.uid, clienteId, parsed.nrNota);
        } catch { /* ignora falha de verificação — usuário pode revisar */ }
      }

      const noOps = parsed.camposFaltando.includes('operacoes');
      // Qualidade IMAGEM ou BAIXA → mantém parsed mas sinaliza para oferecer servidor
      const qualidadeBaixa = deveriaUsarServidorParser(parsed.qualidade);
      const nextStatus: ItemStatus = isDuplicate
        ? 'skipped'
        : noOps && !qualidadeBaixa
          ? 'error'
          : parsed.camposFaltando.length > 0
            ? 'needs_review'
            : 'ready';

      if (mountedRef.current) {
        setItems((prev) =>
          prev.map((i) =>
            i.id !== itemId
              ? i
              : {
                  ...i,
                  status: nextStatus,
                  parsed,
                  isDuplicate,
                  qualidadeBaixa,
                  error: isDuplicate
                    ? `Nota ${parsed.nrNota} já importada`
                    : noOps && !qualidadeBaixa
                      ? 'Nenhuma operação encontrada — verifique o formato do PDF'
                      : undefined,
                },
          ),
        );
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Erro inesperado' }
              : i,
          ),
        );
      }
    }
  }, [clienteId, user]);

  // ── Parser servidor (fallback Python/correpy) ─────────────────────────────
  const parseItemServidor = useCallback(async (itemId: string, file: File, pwd: string) => {
    setItems((prev) =>
      prev.map((i) => i.id === itemId ? { ...i, status: 'parsing', error: undefined, qualidadeBaixa: false } : i),
    );
    try {
      const buffer = await file.arrayBuffer();
      const { parseSinacorNotaServer } = await import('@/lib/ir/server-parser');
      const parsed = await parseSinacorNotaServer(buffer, pwd || undefined);

      let isDuplicate = false;
      if (parsed.nrNota && user) {
        try { isDuplicate = await notaJaExiste(user.uid, clienteId, parsed.nrNota); } catch { /* ignora */ }
      }

      const noOps = parsed.camposFaltando.includes('operacoes');
      const nextStatus: ItemStatus = isDuplicate ? 'skipped' : noOps ? 'error' : parsed.camposFaltando.length > 0 ? 'needs_review' : 'ready';

      if (mountedRef.current) {
        setItems((prev) =>
          prev.map((i) =>
            i.id !== itemId ? i : {
              ...i, status: nextStatus, parsed, isDuplicate, qualidadeBaixa: false,
              error: isDuplicate ? `Nota ${parsed.nrNota} já importada` : noOps ? 'Sem operações (servidor)' : undefined,
            },
          ),
        );
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const raw = err instanceof Error ? err.message : '';
        const msg = raw.includes('internal') || raw.includes('NOT_FOUND') || raw.includes('unavailable')
          ? 'Parser servidor indisponível. Ative as Firebase Functions (plano Blaze) ou use a versão digital da nota.'
          : raw || 'Erro no parser servidor';
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: 'error', error: msg } : i,
          ),
        );
      }
    }
  }, [clienteId, user]);

  // ── Entrada de arquivos ───────────────────────────────────────────────────
  const handleFiles = useCallback((files: File[]) => {
    const valid = files.filter(
      (f) => (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
        && f.size <= MAX_SIZE,
    );
    if (!valid.length) return;

    const newItems: QueueItem[] = valid.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: 'parsing',
      corrections: {},
      isDuplicate: false,
    }));

    setItems((prev) => [...prev, ...newItems]);

    // Processa sequencialmente para não sobrecarregar o browser
    const pwd = password;
    (async () => {
      for (const item of newItems) {
        if (!mountedRef.current) break;
        await parseItem(item.id, item.file, pwd);
      }
    })();
  }, [password, parseItem]);

  // ── Correções manuais ─────────────────────────────────────────────────────
  const applyCorrection = (itemId: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, corrections: { ...i.corrections, [field]: value } } : i,
      ),
    );
  };

  const confirmarRevisao = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId || !i.parsed) return i;
        const stillMissing = i.parsed.camposFaltando
          .filter((f) => f !== 'resumoFinanceiro' && f !== 'operacoes')
          .filter((f) => !i.corrections[f]?.trim());
        return stillMissing.length === 0 ? { ...i, status: 'ready' } : i;
      }),
    );
  };

  // ── Importação para Firestore ─────────────────────────────────────────────
  const importarNotas = async () => {
    if (!user) return;
    setSaving(true);
    let savedAny = false;

    for (const item of items.filter((i) => i.status === 'ready')) {
      if (!item.parsed) continue;
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'saving' } : i));
      try {
        await salvarNota(user.uid, clienteId, item.parsed, item.corrections);
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'done' } : i));
        savedAny = true;
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', error: 'Erro ao salvar no Firestore' } : i,
          ),
        );
      }
    }

    if (savedAny) {
      // Recalcula PM → depois apuração mensal (ordem obrigatória: PM primeiro)
      try { await recalcularPMCompleto(user.uid, clienteId); } catch (e) {
        console.error('[ir] recalcularPMCompleto falhou:', e);
      }
      try { await recalcularApuracoesCompleto(user.uid, clienteId); } catch (e) {
        console.error('[ir] recalcularApuracoesCompleto falhou:', e);
      }
    }

    setSaving(false);
    if (savedAny) onSaved();
  };

  if (!open) return null;

  const readyCount = items.filter((i) => i.status === 'ready').length;
  const busy = items.some((i) => i.status === 'parsing' || i.status === 'saving') || saving;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Importar Notas de Corretagem</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Senha */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">
                Senha do PDF (se protegido)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ex: 123"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-svn-ruby"
              />
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Dica: primeiros 3<br />dígitos do CPF
            </p>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-svn-ruby bg-red-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 font-medium">
              Arraste as notas PDF aqui
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ou clique para selecionar · máx. 10 MB por arquivo
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
          />

          {/* Fila */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <NotaQueueItem
                  key={item.id}
                  fileName={item.file.name}
                  status={item.status}
                  parsed={item.parsed}
                  error={item.error}
                  isDuplicate={item.isDuplicate}
                  qualidadeBaixa={item.qualidadeBaixa}
                  corrections={item.corrections}
                  onRetry={() => parseItem(item.id, item.file, password)}
                  onServidorParser={() => parseItemServidor(item.id, item.file, password)}
                  onCorrection={(field, value) => applyCorrection(item.id, field, value)}
                  onConfirmar={() => confirmarRevisao(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {items.length > 0
              ? `${items.length} arquivo${items.length !== 1 ? 's' : ''} · ${readyCount} pronto${readyCount !== 1 ? 's' : ''}`
              : 'Nenhum arquivo adicionado'}
          </p>
          <button
            onClick={importarNotas}
            disabled={readyCount === 0 || busy}
            className="px-5 py-2 bg-svn-carbon text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-[#2e2420] transition-colors"
          >
            {saving ? 'Importando…' : `Importar ${readyCount} nota${readyCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
