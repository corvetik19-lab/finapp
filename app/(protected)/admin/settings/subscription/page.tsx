import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Calendar, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  
  if (!organization) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600">Организация не найдена</h1>
      </div>
    );
  }

  // Заглушка для данных подписки
  const subscription = {
    plan: "Бизнес",
    status: "active",
    usersLimit: 10,
    usersUsed: 3,
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU"),
    price: "2 990 ₽/мес",
  };

  return (
    <div className="space-y-6 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Подписка</h1>
        <p className="text-gray-500 mt-1">
          Управление тарифным планом организации
        </p>
      </header>

      {/* Текущий план */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Текущий план
            </CardTitle>
            <Badge className="bg-green-500">Активна</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Тарифный план</div>
              <div className="text-2xl font-bold text-indigo-600">{subscription.plan}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Пользователи
              </div>
              <div className="text-2xl font-bold">{subscription.usersUsed} / {subscription.usersLimit}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Следующее списание
              </div>
              <div className="text-2xl font-bold">{subscription.nextBilling}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Стоимость</div>
              <div className="text-2xl font-bold">{subscription.price}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Функции плана */}
      <Card>
        <CardHeader>
          <CardTitle>Включено в ваш план</CardTitle>
          <CardDescription>Доступные функции и лимиты</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "До 10 пользователей",
              "Все режимы работы",
              "Интеграция с Telegram",
              "Экспорт отчётов",
              "API доступ",
              "Приоритетная поддержка",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Действия */}
      <div className="flex gap-3">
        <Button variant="outline">Изменить план</Button>
        <Button variant="outline">История платежей</Button>
      </div>
    </div>
  );
}
