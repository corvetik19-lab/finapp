import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  FileText,
  Bell,
  Settings,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

export const metadata = {
  title: "Портал Инвестора",
  description: "Личный кабинет инвестора с отслеживанием инвестиций",
  manifest: "/investor-manifest.json",
  themeColor: "#0EA5E9",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Портал Инвестора",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

interface InvestorPortalLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { href: "/investor-portal", label: "Обзор", icon: LayoutDashboard },
  { href: "/investor-portal/investments", label: "Мои инвестиции", icon: Wallet },
  { href: "/investor-portal/schedule", label: "График платежей", icon: Calendar },
  { href: "/investor-portal/documents", label: "Документы", icon: FileText },
  { href: "/investor-portal/analytics", label: "Аналитика", icon: TrendingUp },
  { href: "/investor-portal/notifications", label: "Уведомления", icon: Bell },
  { href: "/investor-portal/settings", label: "Настройки", icon: Settings },
];

export default async function InvestorPortalLayout({
  children,
}: InvestorPortalLayoutProps) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/investors"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Портал инвестора
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border p-4 sticky top-24">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
