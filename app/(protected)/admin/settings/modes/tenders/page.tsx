import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Save, Construction } from "lucide-react";

export default async function TendersModeSettingsPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Настройки режима &quot;Тендеры&quot;
        </h1>
        <p className="text-muted-foreground">Конфигурация параметров работы с тендерами</p>
      </div>
      
      <Card>
        <CardHeader><CardTitle>Основные настройки</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Валюта по умолчанию</Label>
            <Select defaultValue="rub">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rub">RUB - Российский рубль</SelectItem>
                <SelectItem value="usd">USD - Доллар США</SelectItem>
                <SelectItem value="eur">EUR - Евро</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Формат номера тендера</Label>
            <Input placeholder="T-{YYYY}-{###}" />
            <p className="text-sm text-muted-foreground">Пример: T-2025-001</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="auto-folder" />
            <Label htmlFor="auto-folder" className="cursor-pointer">Автоматически создавать папку для документов</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="deadline-notify" />
            <Label htmlFor="deadline-notify" className="cursor-pointer">Отправлять уведомления о приближающихся дедлайнах</Label>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Уведомления</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Напоминать о дедлайне за</Label>
            <Select defaultValue="3">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 день</SelectItem>
                <SelectItem value="3">3 дня</SelectItem>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="14">14 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="email-notify" defaultChecked />
            <Label htmlFor="email-notify" className="cursor-pointer">Email уведомления</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="tg-notify" />
            <Label htmlFor="tg-notify" className="cursor-pointer">Telegram уведомления</Label>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Интеграции</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
            <div>
              <h4 className="font-medium">Zakupki.gov.ru</h4>
              <p className="text-sm text-muted-foreground">Автоматический импорт тендеров</p>
            </div>
            <Button>Настроить</Button>
          </div>
          <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
            <div>
              <h4 className="font-medium">AI Анализ</h4>
              <p className="text-sm text-muted-foreground">Автоматический анализ документации</p>
            </div>
            <Button>Настроить</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-4">
        <Button><Save className="h-4 w-4 mr-2" />Сохранить изменения</Button>
        <Button variant="outline">Отмена</Button>
      </div>
      
      <Alert className="bg-amber-50 border-amber-300">
        <Construction className="h-4 w-4" />
        <AlertDescription><strong>В разработке:</strong> Настройки режима Тендеры находятся в стадии разработки.</AlertDescription>
      </Alert>
    </div>
  );
}
