"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/sidebar";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const isLogin = pathname === "/login" || pathname === "/login/";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLogin) router.replace("/login");
    if (user  &&  isLogin) router.replace("/");
  }, [user, loading, isLogin, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    );
  }

  // Página de login — sem sidebar
  if (isLogin) return <>{children}</>;

  // Não autenticado — blank enquanto o redirect ocorre
  if (!user) return null;

  // Autenticado — sidebar + conteúdo
  return (
    <>
      <Sidebar />
      <main className="ml-56 min-h-screen p-6">{children}</main>
    </>
  );
}
