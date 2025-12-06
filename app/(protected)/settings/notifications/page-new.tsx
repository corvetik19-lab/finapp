"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { AlertCircle, CheckCircle, Send, Clock, Bell, Trash2, Loader2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NotificationSettings {
  overspend_alerts: boolean;
  budget_warnings: boolean;
  missing_transaction_reminders: boolean;
  upcoming_payment_reminders: boolean;
  ai_insights: boolean;
  ai_recommendations: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  notification_frequency: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  schedule_enabled: boolean;
  schedule_time: string;
  schedule_days: number[];
  telegram_enabled: boolean;
  telegram_chat_id: number | null;
  telegram_username: string | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
];

export default function NotificationSettingsPage() {
  const { notifications, clearAll } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings/notifications");
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError("Не удалось загрузить настройки");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Не удалось сохранить настройки");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const updateSetting = (key: keyof NotificationSettings, value: unknown) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const days = settings.schedule_days || [];
    const newDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort();
    updateSetting("schedule_days", newDays);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12 text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="text-destructive">{error || "Не удалось загрузить настройки"}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Настройки уведомлений</h1>
          <p className="text-muted-foreground">
            Настройте типы уведомлений, время и канал доставки
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <span className="text-2xl font-bold">{notifications.length}</span>
            <span className="block text-sm text-muted-foreground">Всего уведомлений</span>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold">
              {notifications.filter((n) => !n.read).length}
            </span>
            <span className="block text-sm text-muted-foreground">Непрочитанных</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-100 text-green-700">
          <CheckCircle className="h-5 w-5" />
          Настройки успешно сохранены
        </div>
      )}

      {/* Telegram интеграция */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Send className="h-5 w-5" />
          Telegram уведомления
        </h2>
        
        <div className="mb-4">
          {settings.telegram_chat_id ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <div>
                <strong>Telegram подключен</strong>
                {settings.telegram_username && <p className="text-sm">@{settings.telegram_username}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <strong>Telegram не подключен</strong>
                <p className="text-sm text-muted-foreground">Перейдите в настройки Telegram для привязки бота</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Отправлять в Telegram</h3>
            <p className="text-sm text-muted-foreground">Получать уведомления в Telegram бот</p>
          </div>
          <Switch
            checked={settings.telegram_enabled}
            onCheckedChange={() => toggleSetting("telegram_enabled")}
            disabled={!settings.telegram_chat_id}
          />
        </div>
      </div>

      {/* Расписание */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          Расписание уведомлений
        </h2>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Использовать расписание</h3>
            <p className="text-sm text-muted-foreground">Отправлять уведомления в определённое время</p>
          </div>
          <Switch
            checked={settings.schedule_enabled}
            onCheckedChange={() => toggleSetting("schedule_enabled")}
          />
        </div>

        {settings.schedule_enabled && (
          <>
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium">Время отправки</h3>
                <p className="text-sm text-muted-foreground">Выберите время для получения уведомлений</p>
              </div>
              <Input
                type="time"
                className="w-32"
                value={settings.schedule_time}
                onChange={(e) => updateSetting("schedule_time", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium">Дни недели</h3>
                <p className="text-sm text-muted-foreground">Выберите дни для получения уведомлений</p>
              </div>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={cn(
                      "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                      settings.schedule_days?.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Тихие часы (начало)</h3>
            <p className="text-sm text-muted-foreground">Не отправлять уведомления с этого времени</p>
          </div>
          <Input
            type="time"
            className="w-32"
            value={settings.quiet_hours_start || ""}
            onChange={(e) => updateSetting("quiet_hours_start", e.target.value || null)}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Тихие часы (конец)</h3>
            <p className="text-sm text-muted-foreground">Возобновить отправку с этого времени</p>
          </div>
          <Input
            type="time"
            className="w-32"
            value={settings.quiet_hours_end || ""}
            onChange={(e) => updateSetting("quiet_hours_end", e.target.value || null)}
          />
        </div>
      </div>

      {/* Типы уведомлений */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5" />
          Типы уведомлений
        </h2>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Превышение трат</h3>
            <p className="text-sm text-muted-foreground">Уведомления об аномальных тратах</p>
          </div>
          <Switch
            checked={settings.overspend_alerts}
            onCheckedChange={() => toggleSetting("overspend_alerts")}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Бюджетные предупреждения</h3>
            <p className="text-sm text-muted-foreground">Уведомления о превышении бюджетов</p>
          </div>
          <Switch
            checked={settings.budget_warnings}
            onCheckedChange={() => toggleSetting("budget_warnings")}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Напоминания о транзакциях</h3>
            <p className="text-sm text-muted-foreground">Напоминания о пропущенных днях</p>
          </div>
          <Switch
            checked={settings.missing_transaction_reminders}
            onCheckedChange={() => toggleSetting("missing_transaction_reminders")}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">Предстоящие платежи</h3>
            <p className="text-sm text-muted-foreground">Напоминания о платежах</p>
          </div>
          <Switch
            checked={settings.upcoming_payment_reminders}
            onCheckedChange={() => toggleSetting("upcoming_payment_reminders")}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">AI инсайты</h3>
            <p className="text-sm text-muted-foreground">Финансовые инсайты на основе AI</p>
          </div>
          <Switch
            checked={settings.ai_insights}
            onCheckedChange={() => toggleSetting("ai_insights")}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="font-medium">AI рекомендации</h3>
            <p className="text-sm text-muted-foreground">Персональные рекомендации</p>
          </div>
          <Switch
            checked={settings.ai_recommendations}
            onCheckedChange={() => toggleSetting("ai_recommendations")}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="destructive" onClick={clearAll}>
          <Trash2 className="h-5 w-5 mr-2" />
          Очистить все
        </Button>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Сохранить настройки
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
