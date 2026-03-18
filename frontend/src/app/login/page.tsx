"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { TrendingUp } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged no AuthGuard vai redirecionar automaticamente
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/invalid-credential":  "E-mail ou senha incorretos.",
        "auth/user-not-found":      "Usuário não encontrado.",
        "auth/wrong-password":      "Senha incorreta.",
        "auth/too-many-requests":   "Muitas tentativas. Aguarde alguns minutos.",
        "auth/invalid-email":       "E-mail inválido.",
      };
      setErro(msgs[err.code] ?? "Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-7 flex items-center gap-3">
          <TrendingUp className="text-blue-400" size={28} />
          <div>
            <p className="text-white font-bold text-lg leading-tight">SVN Investimentos</p>
            <p className="text-slate-400 text-xs">Plataforma CRM · Assessores</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={entrar} className="px-8 py-7 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Entrar</h2>
            <p className="text-slate-400 text-sm mt-1">Acesse com seu e-mail e senha</p>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">E-mail</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Acesso restrito a assessores autorizados.
          </p>
        </form>
      </div>
    </div>
  );
}
