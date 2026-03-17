"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Bell, Calendar, Target, FileSpreadsheet, TrendingUp, Briefcase, Search, Layers,
} from "lucide-react";

const nav = [
  { href: "/",          icon: LayoutDashboard,  label: "Dashboard"   },
  { href: "/clientes",  icon: Users,            label: "Clientes"    },
  { href: "/alertas",   icon: Bell,             label: "Alertas"     },
  { href: "/agenda",    icon: Calendar,         label: "Agenda"      },
  { href: "/ofertas",   icon: Briefcase,        label: "Ofertas"     },
  { href: "/fundos",    icon: Layers,           label: "Fundos"      },
  { href: "/leads",     icon: Target,           label: "Leads"       },
  { href: "/busca",     icon: Search,           label: "Buscar Ativo"},
  { href: "/relatorios",icon: FileSpreadsheet,  label: "Relatórios"  },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 text-slate-100 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <TrendingUp className="text-blue-400" size={22} />
        <span className="font-bold text-white text-sm leading-tight">SVN<br/>Investimentos</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        Lucas Campanini<br/>Assessor · A69567
      </div>
    </aside>
  );
}
