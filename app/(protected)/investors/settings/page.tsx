import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, FileText } from "lucide-react";

export default function InvestorsSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Настройки модуля</h1>
        <p className="text-muted-foreground">Настройки модуля инвесторов</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
          <CardDescription>
            Настройки уведомлений о предстоящих платежах и просроченных возвратах
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Раздел в разработке</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Шаблоны документов
          </CardTitle>
          <CardDescription>
            Шаблоны договоров и соглашений с инвесторами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Раздел в разработке</p>
        </CardContent>
      </Card>
    </div>
  );
}
