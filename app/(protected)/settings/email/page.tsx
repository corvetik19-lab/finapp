"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, Save, AlertCircle, DollarSign, BarChart3 } from "lucide-react";

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
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" />Email уведомления</h1><p className="text-muted-foreground">Управление типами уведомлений</p></div>

      {message && <Alert variant={message.type === "error" ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Типы уведомлений</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-muted-foreground" /><div><Label>Превышение бюджета</Label><p className="text-sm text-muted-foreground">Уведомления при 80% бюджета</p></div></div><Switch checked={preferences.budget_alerts_enabled} onCheckedChange={(v) => updatePreference("budget_alerts_enabled", v)} /></div>
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-muted-foreground" /><div><Label>Крупные транзакции</Label><p className="text-sm text-muted-foreground">Необычно крупные траты</p></div></div><Switch checked={preferences.transaction_alerts_enabled} onCheckedChange={(v) => updatePreference("transaction_alerts_enabled", v)} /></div>
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-muted-foreground" /><div><Label>Еженедельная сводка</Label><p className="text-sm text-muted-foreground">Финансовый отчёт за неделю</p></div></div><Switch checked={preferences.weekly_summary_enabled} onCheckedChange={(v) => updatePreference("weekly_summary_enabled", v)} /></div>
          {preferences.weekly_summary_enabled && (
            <div className="grid grid-cols-2 gap-4 pl-8">
              <div className="space-y-2"><Label>День недели</Label><Select value={String(preferences.weekly_summary_day)} onValueChange={(v) => updatePreference("weekly_summary_day", parseInt(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS_OF_WEEK.map((day) => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Время</Label><Input type="time" value={preferences.weekly_summary_time} onChange={(e) => updatePreference("weekly_summary_time", e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Дополнительно</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Альтернативный email (необязательно)</Label>
          <p className="text-sm text-muted-foreground">По умолчанию уведомления на основной email</p>
          <Input type="email" placeholder="your.email@example.com" value={preferences.custom_email || ""} onChange={(e) => updatePreference("custom_email", e.target.value || null)} />
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={savePreferences} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : <><Save className="h-4 w-4 mr-1" />Сохранить</>}</Button></div>

      <Alert><AlertDescription>Для отправки email уведомлений убедитесь, что указан ключ Resend API.</AlertDescription></Alert>
    </div>
  );
}
