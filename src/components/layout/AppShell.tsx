"use client";

import React, { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  CalendarDays,
  QrCode,
  Settings,
  Languages,
  UserCheck,
  Menu,
  X,
  Sprout,
  Satellite,
} from "lucide-react";
import { DemoBadge } from "../shared/DemoBadge";
import { Language, translations } from "@/lib/i18n";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.en;
  role: "FPO_ADMIN" | "FIELD_OFFICER";
  setRole: (role: "FPO_ADMIN" | "FIELD_OFFICER") => void;
}

const AppContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
  role: "FPO_ADMIN",
  setRole: () => {},
});

export const useApp = () => useContext(AppContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [lang, setLang] = useState<Language>("en");
  const [role, setRole] = useState<"FPO_ADMIN" | "FIELD_OFFICER">("FPO_ADMIN");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = translations[lang];

  // Don't show app shell on public trace page
  if (pathname.startsWith("/trace/")) {
    return <main className="min-h-screen bg-[#fdfbf7] dark:bg-stone-950">{children}</main>;
  }

  const navItems = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { href: "/verify", label: t.verify, icon: ShieldCheck },
    { href: "/members", label: t.members, icon: Users },
    { href: "/harvest", label: t.harvest, icon: CalendarDays },
    { href: "/lots", label: t.lots, icon: QrCode },
    { href: "/settings", label: t.settings, icon: Settings },
  ];

  return (
    <AppContext.Provider value={{ lang, setLang, t, role, setRole }}>
      <div className="min-h-screen flex flex-col md:flex-row bg-[#fdfbf7] dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        {/* Desktop Sidebar (Sticky, stays in view on scroll) */}
        <aside className="no-print hidden md:flex flex-col w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shrink-0 sticky top-0 h-screen z-30">
          {/* Logo & Tagline */}
          <div className="p-5 border-b border-stone-200 dark:border-stone-800 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm">
                <Sprout className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight text-emerald-950 dark:text-emerald-400">
                  {t.appName}
                </h1>
                <p className="text-[11px] text-stone-500 font-medium">ALU & AMED Satellite AI</p>
              </div>
            </Link>
            <div className="mt-3">
              <DemoBadge isMock={true} />
            </div>
          </div>

          {/* Navigation Links (Scrollable if viewport is short) */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-stone-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Role Switcher & Language Toggle in Sidebar Footer */}
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-3 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
            {/* Active User Persona */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Active Mode:</span>
              <button
                type="button"
                onClick={() => setRole(role === "FPO_ADMIN" ? "FIELD_OFFICER" : "FPO_ADMIN")}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {role === "FPO_ADMIN" ? t.fpoAdmin : t.fieldOfficer}
              </button>
            </div>

            {/* Language switch */}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-stone-500" />
              <span>{t.switchLanguage}</span>
            </button>
          </div>
        </aside>

        {/* Mobile Top Header */}
        <header className="no-print md:hidden flex items-center justify-between p-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <Sprout className="w-4 h-4 text-emerald-100" />
            </div>
            <span className="font-bold text-base text-emerald-950 dark:text-emerald-400">
              {t.appName}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <DemoBadge isMock={true} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="no-print md:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 space-y-2 z-50">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Icon className="w-4 h-4 text-emerald-700" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRole(role === "FPO_ADMIN" ? "FIELD_OFFICER" : "FPO_ADMIN")}
                className="text-xs font-semibold text-emerald-700"
              >
                Role: {role === "FPO_ADMIN" ? t.fpoAdmin : t.fieldOfficer}
              </button>
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "hi" : "en")}
                className="text-xs font-medium text-stone-600 underline"
              >
                {t.switchLanguage}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
        </div>

        {/* Mobile Bottom Navigation Bar (Large touch targets for Field Officers) */}
        <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 flex items-center justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-emerald-700 dark:text-emerald-400 font-bold"
                    : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-300"
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-emerald-700 dark:text-emerald-400" : ""}`} />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
