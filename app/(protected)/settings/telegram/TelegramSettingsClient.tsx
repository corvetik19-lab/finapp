"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, Link as LinkIcon, Loader2 } from "lucide-react";

interface TelegramSettings {
  telegram_user_id: string | null;
  telegram_username: string | null;
  telegram_linked_at: string | null;
  telegram_chat_id: number | null;
  active_code: string | null;
  code_expires_at: string | null;
}

export default function TelegramSettingsClient() {
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings/telegram");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // Если есть активный код, показываем его
        if (data.active_code) {
          setLinkCode(data.active_code);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateLinkCode() {
    setGeneratingCode(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/telegram/link-code", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate code");

      const data = await res.json();
      setLinkCode(data.code);
      setMessage({
        type: "success",
        text: data.reused 
          ? "Ваш код ещё действителен! Отправьте его боту." 
          : "Код сгенерирован! Отправьте его боту в течение 10 минут.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Ошибка генерации кода",
      });
    } finally {
      setGeneratingCode(false);
    }
  }

  async function unlinkTelegram() {
    if (!confirm("Отвязать Telegram аккаунт?")) {
      return;
    }

    try {
      const res = await fetch("/api/settings/telegram", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to unlink");

      setMessage({
        type: "success",
        text: "Telegram аккаунт отвязан",
      });
      loadSettings();
      setLinkCode(null);
    } catch {
      setMessage({
        type: "error",
        text: "Ошибка при отвязке",
      });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const isLinked = settings?.telegram_user_id !== null;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6" />Telegram Бот</h1><p className="text-muted-foreground">Управляйте финансами из Telegram</p></div>

      {message && <Alert variant={message.type === "error" ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert>}

      {isLinked && settings ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div><CardTitle>Telegram подключен</CardTitle><p className="text-muted-foreground">@{settings.telegram_username || "без username"}</p></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">User ID:</span> <Badge variant="secondary">{settings.telegram_user_id}</Badge></div>
              {settings.telegram_linked_at && <div><span className="text-muted-foreground">Подключено:</span> {new Date(settings.telegram_linked_at).toLocaleDateString("ru-RU")}</div>}
            </div>
            <Button variant="destructive" onClick={unlinkTelegram}>Отвязать</Button>
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Команды:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><code className="bg-muted px-1 rounded">/balance</code> — Баланс</div>
                <div><code className="bg-muted px-1 rounded">/stats</code> — Статистика</div>
                <div><code className="bg-muted px-1 rounded">/budgets</code> — Бюджеты</div>
                <div><code className="bg-muted px-1 rounded">/add 500 кофе</code> — Расход</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Как подключить</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4"><Badge className="h-8 w-8 flex items-center justify-center rounded-full">1</Badge><div><p className="font-medium">Найдите бота</p><p className="text-sm text-muted-foreground">@finapp_tracker_bot</p></div></div>
            <div className="flex gap-4"><Badge className="h-8 w-8 flex items-center justify-center rounded-full">2</Badge><div><p className="font-medium">Сгенерируйте код</p></div></div>
            {linkCode ? (
              <Card className="bg-muted"><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Код привязки:</p><p className="text-3xl font-mono font-bold my-2">{linkCode}</p><p className="text-xs text-muted-foreground">Действителен 10 минут</p></CardContent></Card>
            ) : (
              <Button onClick={generateLinkCode} disabled={generatingCode}>{generatingCode ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Генерация...</> : <><LinkIcon className="h-4 w-4 mr-1" />Сгенерировать код</>}</Button>
            )}
            <div className="flex gap-4"><Badge className="h-8 w-8 flex items-center justify-center rounded-full">3</Badge><div><p className="font-medium">Отправьте боту</p><p className="text-sm text-muted-foreground"><code>/start {linkCode || "ВАШ_КОД"}</code></p></div></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
