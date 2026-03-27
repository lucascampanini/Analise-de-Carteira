"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, Bell, Calendar, Target, Briefcase, TrendingUp, LogOut, BarChart2, PieChart, FolderInput, Search, Calculator,
} from "lucide-react";

const nav = [
  { href: "/",              icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clientes",      icon: Users,           label: "Clientes"  },
  { href: "/fundos",        icon: BarChart2,        label: "Carteira"  },
  { href: "/fundos-lista",  icon: PieChart,         label: "Fundos"    },
  { href: "/alertas",       icon: Bell,            label: "Alertas"   },
  { href: "/agenda",        icon: Calendar,        label: "Agenda"    },
  { href: "/ofertas",       icon: Briefcase,       label: "Ofertas"   },
  { href: "/leads",         icon: Target,          label: "Leads"     },
  { href: "/importar",      icon: FolderInput,     label: "Importar"  },
  { href: "/buscar",        icon: Search,           label: "Buscar"    },
];

const navExterno = [
  { href: "https://simulador-consorcio-rho.vercel.app/", icon: Calculator, label: "Consórcio" },
];

export function Sidebar() {
  const path        = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-14 md:w-56 bg-svn-carbon text-slate-100 flex flex-col z-30 transition-all duration-200">
      {/* Logo */}
      <div className="flex items-center justify-center md:justify-start gap-2 px-0 md:px-5 py-5 border-b border-[#2e2420]">
        <TrendingUp className="text-svn-skies shrink-0" size={22} />
        <span className="hidden md:block font-bold text-white text-sm leading-tight">
          SVN<br />Investimentos
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-1 md:px-2 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 md:py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-svn-ruby text-white"
                  : "text-slate-400 hover:bg-[#2e2420] hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}

        {/* Separador */}
        <div className="pt-2 pb-1 px-1 md:px-3">
          <p className="hidden md:block text-xs text-[#5a4a44] uppercase tracking-wider">Ferramentas</p>
          <div className="block md:hidden h-px bg-[#2e2420] mx-1" />
        </div>

        {navExterno.map(({ href, icon: Icon, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className="flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 md:py-2 rounded-lg text-sm transition-colors text-slate-400 hover:bg-[#2e2420] hover:text-white"
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden md:block">{label}</span>
            <span className="hidden md:block ml-auto text-slate-600 text-xs">↗</span>
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-1 md:px-4 py-4 border-t border-[#2e2420] space-y-3">
        {user && (
          <div className="hidden md:block text-xs text-slate-400 truncate px-1">
            {user.displayName || user.email}
          </div>
        )}
        <button
          onClick={logout}
          title="Sair"
          className="flex items-center justify-center md:justify-start gap-2 w-full px-0 md:px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-[#2e2420] hover:text-white transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="hidden md:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
