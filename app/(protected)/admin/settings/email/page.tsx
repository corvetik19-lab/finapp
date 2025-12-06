"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface EmailPreferences {
  budget_alerts_enabled: boolean;
  transaction_alerts_enabled: boolean;
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  weekly_summary_time: string;
  custom_email: string | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

export default function EmailSettingsPage() {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    budget_alerts_enabled: true,
    transaction_alerts_enabled: true,
    weekly_summary_enabled: false,
    weekly_summary_day: 1,
    weekly_summary_time: "09:00",
    custom_email: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/user/email-preferences");
      if (!response.ok) throw new Error("Failed to load preferences");
      
      const data = await response.json();
      setPreferences({
        ...data,
        weekly_summary_time: data.weekly_summary_time?.substring(0, 5) || "09:00",
      });
    } catch (error) {
      console.error("Error loading preferences:", error);
      setMessage({ type: "error", text: "Не удалось загрузить настройки" });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) throw new Error("Failed to save preferences");

      setMessage({ type: "success", text: "Настройки успешно сохранены!" });
      
      // Скрыть сообщение через 3 секунды
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof EmailPreferences, value: boolean | number | string | null) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Загрузка настроек...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">📧 Настройки Email Уведомлений</h1>
        <p className="text-muted-foreground">
          Управляйте типами уведомлений, которые вы хотите получать на email
        </p>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-lg",
          message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
        )}>
          {message.text}
        </div>
      )}

      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Типы уведомлений</h2>

        {/* Бюджетные алерты */}
        <div className="flex items-center justify-between py-3 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h3 className="font-medium">Превышение бюджета</h3>
              <p className="text-sm text-muted-foreground">
                Получать уведомления когда расходы достигают 80% от бюджета
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.budget_alerts_enabled}
            onCheckedChange={(checked) => updatePreference("budget_alerts_enabled", checked)}
          />
        </div>

        {/* Алерты крупных транзакций */}
        <div className="flex items-center justify-between py-3 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <div>
              <h3 className="font-medium">Крупные транзакции</h3>
              <p className="text-sm text-muted-foreground">
                Получать уведомления о необычно крупных тратах
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.transaction_alerts_enabled}
            onCheckedChange={(checked) => updatePreference("transaction_alerts_enabled", checked)}
          />
        </div>

        {/* Еженедельная сводка */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="font-medium">Еженедельная сводка</h3>
              <p className="text-sm text-muted-foreground">
                Получать финансовый отчёт за неделю
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.weekly_summary_enabled}
            onCheckedChange={(checked) => updatePreference("weekly_summary_enabled", checked)}
          />
        </div>

        {/* Настройки еженедельной сводки */}
        {preferences.weekly_summary_enabled && (
          <div className="bg-muted/50 rounded-lg p-4 mt-4 space-y-4">
            <div className="text-sm font-medium">Расписание еженедельной сводки</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">День недели</label>
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={preferences.weekly_summary_day}
                  onChange={(e) => updatePreference("weekly_summary_day", parseInt(e.target.value))}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Время</label>
                <Input
                  type="time"
                  value={preferences.weekly_summary_time}
                  onChange={(e) => updatePreference("weekly_summary_time", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Кастомный email (опционально) */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Дополнительно</h2>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Альтернативный email адрес (необязательно)
          </label>
          <p className="text-sm text-muted-foreground">
            По умолчанию уведомления отправляются на ваш основной email
          </p>
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={preferences.custom_email || ""}
            onChange={(e) => updatePreference("custom_email", e.target.value || null)}
          />
        </div>
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </div>

      {/* Информация */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-xl">ℹ️</span>
        <div className="text-sm">
          <p>
            <strong>Важно:</strong> Для отправки email уведомлений убедитесь, что в настройках проекта указан ключ Resend API.
          </p>
          <p className="text-muted-foreground mt-1">
            Подробнее: <code className="bg-muted px-1 rounded">docs/EMAIL_SETUP.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
