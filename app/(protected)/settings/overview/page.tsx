import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Building2, Users, Shield, Plug, Settings, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SettingsOverviewPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();

  const cards = [
    { icon: CreditCard, title: "Подписка", desc: "Тариф и сроки", href: "/settings/subscription", color: "bg-purple-500" },
    { icon: Building2, title: "Организация", desc: organization?.name || "Не настроено", href: "/settings/organization", color: "bg-indigo-500" },
    { icon: Users, title: "Пользователи", desc: "Управление доступом", href: "/settings/users", color: "bg-green-500" },
    { icon: Shield, title: "Роли и права", desc: "Настройка прав", href: "/settings/roles", color: "bg-yellow-500" },
    { icon: Plug, title: "Интеграции", desc: "Telegram, n8n", href: "/settings/integrations", color: "bg-pink-500" },
    { icon: Settings, title: "Режимы", desc: "Финансы, Инвестиции", href: "/settings/modes/finance", color: "bg-blue-500" },
    { icon: Lock, title: "Безопасность", desc: "2FA, логи", href: "/settings/security", color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Обзор настроек</h1>
        <div className="text-muted-foreground">Управляйте организацией, пользователями, интеграциями</div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
          <Link key={card.href} href={card.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`p-3 rounded-lg ${card.color}`}><Icon className="h-6 w-6 text-white" /></div>
                <div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">{card.desc}</div>
                </div>
              </CardHeader>
              <CardContent><span className="text-sm text-primary flex items-center gap-1">Перейти <ArrowRight className="h-4 w-4" /></span></CardContent>
            </Card>
          </Link>
        )})}
      </div>
    </div>
  );
}
