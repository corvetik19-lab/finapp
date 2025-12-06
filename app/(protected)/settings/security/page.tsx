import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Monitor } from "lucide-react";

export default async function SecuritySettingsPage() {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Безопасность</h1>
        <p className="text-muted-foreground">Настройки безопасности аккаунта</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Двухфакторная аутентификация
          </CardTitle>
          <CardDescription>
            Добавьте дополнительный уровень защиты для вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Настроить 2FA</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Активные сессии
          </CardTitle>
          <CardDescription>
            Управление активными сессиями вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Здесь будут отображаться активные сессии</p>
        </CardContent>
      </Card>
    </div>
  );
}
