"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, Bell, Calendar, Target, Briefcase, TrendingUp, LogOut,
} from "lucide-react";

const nav = [
  { href: "/",         icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clientes", icon: Users,           label: "Clientes"  },
  { href: "/alertas",  icon: Bell,            label: "Alertas"   },
  { href: "/agenda",   icon: Calendar,        label: "Agenda"    },
  { href: "/ofertas",  icon: Briefcase,       label: "Ofertas"   },
  { href: "/leads",    icon: Target,          label: "Leads"     },
];

export function Sidebar() {
  const path        = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 text-slate-100 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <TrendingUp className="text-blue-400" size={22} />
        <span className="font-bold text-white text-sm leading-tight">
          SVN<br />Investimentos
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-700 space-y-3">
        {user && (
          <div className="text-xs text-slate-400 truncate px-1">
            {user.displayName || user.email}
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
