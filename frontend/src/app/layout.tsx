import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SVN CRM · Assessor",
  description: "Plataforma de gestão de clientes e carteiras",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50`}>
        <Sidebar />
        <main className="ml-56 min-h-screen p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
