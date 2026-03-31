"use client";
import { ExternalLink } from "lucide-react";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const src  = `${base}/projecao_carteira.html`;

export default function ProjecaoPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-48px)] md:h-[calc(100vh-72px)] -m-3 md:-m-6">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-2 bg-svn-carbon text-white shrink-0">
        <div>
          <span className="font-semibold text-sm">Projeção de Carteira</span>
          <span className="ml-2 text-xs text-slate-400">Simulador SVN</span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <ExternalLink size={13} />
          Abrir em nova aba
        </a>
      </div>

      {/* Iframe full-height */}
      <iframe
        src={src}
        className="flex-1 w-full border-0"
        title="Simulador de Projeção de Carteira"
      />
    </div>
  );
}
