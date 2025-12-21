"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast/ToastContext";
import {
  Bell,
  Mail,
  MessageSquare,
  Shield,
  Save,
  Loader2,
  Globe,
} from "lucide-react";

export default function InvestorSettingsPage() {
  const { show } = useToast();
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    notifications: {
      emailEnabled: true,
      telegramEnabled: false,
      paymentReminders: true,
      overdueAlerts: true,
      monthlyReports: true,
      newsUpdates: false,
    },
    display: {
      language: "ru",
      currency: "RUB",
      timezone: "Europe/Moscow",
    },
    security: {
      twoFactorEnabled: false,
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      show("Настройки сохранены", { type: "success" });
    } catch {
      show("Ошибка сохранения", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-muted-foreground">Управление уведомлениями и предпочтениями</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Сохранить
            </>
          )}
        </Button>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Уведомления
          </CardTitle>
          <CardDescription>Настройте способы получения уведомлений</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Channels */}
          <div className="space-y-4">
            <h4 className="font-medium">Каналы уведомлений</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email уведомления</p>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления на email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications.emailEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, emailEnabled: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Telegram уведомления</p>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления в Telegram
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications.telegramEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, telegramEnabled: checked },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Types */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Типы уведомлений</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p>Напоминания о платежах</p>
                  <p className="text-sm text-muted-foreground">
                    За 7, 3 и 1 день до срока возврата
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.paymentReminders}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, paymentReminders: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p>Уведомления о просрочках</p>
                  <p className="text-sm text-muted-foreground">
                    При нарушении сроков платежей
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.overdueAlerts}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, overdueAlerts: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p>Ежемесячные отчёты</p>
                  <p className="text-sm text-muted-foreground">
                    Сводка за месяц 1-го числа
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.monthlyReports}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, monthlyReports: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p>Новости и обновления</p>
                  <p className="text-sm text-muted-foreground">
                    Информация о новых возможностях
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.newsUpdates}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, newsUpdates: checked },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-500" />
            Отображение
          </CardTitle>
          <CardDescription>Региональные настройки</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Язык интерфейса</Label>
              <Select
                value={settings.display.language}
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    display: { ...prev.display, language: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select
                value={settings.display.currency}
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    display: { ...prev.display, currency: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUB">Рубль (₽)</SelectItem>
                  <SelectItem value="USD">Доллар ($)</SelectItem>
                  <SelectItem value="EUR">Евро (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Безопасность
          </CardTitle>
          <CardDescription>Настройки безопасности аккаунта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Двухфакторная аутентификация</p>
              <p className="text-sm text-muted-foreground">
                Дополнительная защита при входе
              </p>
            </div>
            <Switch
              checked={settings.security.twoFactorEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  security: { ...prev.security, twoFactorEnabled: checked },
                }))
              }
            />
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline">Изменить пароль</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
