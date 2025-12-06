"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Loader2, Save, Trash2, CheckCircle, MessageCircle } from "lucide-react";

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
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!settings) {
    return <Alert variant="destructive"><AlertDescription>{error || "Не удалось загрузить"}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" />Уведомления</h1><p className="text-muted-foreground">Типы, время и канал доставки</p></div>
        <div className="flex gap-2"><Badge variant="outline">Всего: {notifications.length}</Badge><Badge variant="secondary">Непрочитанных: {notifications.filter((n) => !n.read).length}</Badge></div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>Настройки сохранены</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Telegram</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {settings.telegram_chat_id ? <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>Telegram подключен{settings.telegram_username && ` (@${settings.telegram_username})`}</AlertDescription></Alert> : <Alert><AlertDescription>Telegram не подключен</AlertDescription></Alert>}
          <div className="flex items-center justify-between"><div><Label>Отправлять в Telegram</Label><p className="text-sm text-muted-foreground">Получать уведомления в бот</p></div><Switch checked={settings.telegram_enabled} onCheckedChange={() => toggleSetting("telegram_enabled")} disabled={!settings.telegram_chat_id} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Расписание</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Использовать расписание</Label><p className="text-sm text-muted-foreground">Отправлять в определённое время</p></div><Switch checked={settings.schedule_enabled} onCheckedChange={() => toggleSetting("schedule_enabled")} /></div>
          {settings.schedule_enabled && (
            <>
              <div className="flex items-center justify-between"><Label>Время отправки</Label><input type="time" className="border rounded px-2 py-1" value={settings.schedule_time} onChange={(e) => updateSetting("schedule_time", e.target.value)} /></div>
              <div className="space-y-2"><Label>Дни недели</Label><div className="flex gap-1">{DAYS_OF_WEEK.map((day) => (<Button key={day.value} size="sm" variant={settings.schedule_days?.includes(day.value) ? "default" : "outline"} onClick={() => toggleDay(day.value)}>{day.label}</Button>))}</div></div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Тихие часы (начало)</Label><input type="time" className="border rounded px-2 py-1 w-full" value={settings.quiet_hours_start || ""} onChange={(e) => updateSetting("quiet_hours_start", e.target.value || null)} /></div>
            <div className="space-y-2"><Label>Тихие часы (конец)</Label><input type="time" className="border rounded px-2 py-1 w-full" value={settings.quiet_hours_end || ""} onChange={(e) => updateSetting("quiet_hours_end", e.target.value || null)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Типы уведомлений</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Превышение трат</Label><p className="text-sm text-muted-foreground">Аномальные траты</p></div><Switch checked={settings.overspend_alerts} onCheckedChange={() => toggleSetting("overspend_alerts")} /></div>
          <div className="flex items-center justify-between"><div><Label>Бюджетные предупреждения</Label><p className="text-sm text-muted-foreground">Превышение бюджетов</p></div><Switch checked={settings.budget_warnings} onCheckedChange={() => toggleSetting("budget_warnings")} /></div>
          <div className="flex items-center justify-between"><div><Label>Напоминания о транзакциях</Label><p className="text-sm text-muted-foreground">Пропущенные дни</p></div><Switch checked={settings.missing_transaction_reminders} onCheckedChange={() => toggleSetting("missing_transaction_reminders")} /></div>
          <div className="flex items-center justify-between"><div><Label>Предстоящие платежи</Label><p className="text-sm text-muted-foreground">Напоминания о платежах</p></div><Switch checked={settings.upcoming_payment_reminders} onCheckedChange={() => toggleSetting("upcoming_payment_reminders")} /></div>
          <div className="flex items-center justify-between"><div><Label>AI инсайты</Label><p className="text-sm text-muted-foreground">Финансовые инсайты</p></div><Switch checked={settings.ai_insights} onCheckedChange={() => toggleSetting("ai_insights")} /></div>
          <div className="flex items-center justify-between"><div><Label>AI рекомендации</Label><p className="text-sm text-muted-foreground">Персональные советы</p></div><Switch checked={settings.ai_recommendations} onCheckedChange={() => toggleSetting("ai_recommendations")} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="destructive" onClick={clearAll}><Trash2 className="h-4 w-4 mr-1" />Очистить все</Button>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : <><Save className="h-4 w-4 mr-1" />Сохранить</>}</Button>
      </div>
    </div>
  );
}
