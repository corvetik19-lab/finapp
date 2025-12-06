"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка...
      </div>
    );
  }

  const isLinked = settings?.telegram_user_id !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">💬 Telegram Бот</h1>
        <p className="text-muted-foreground">
          Управляйте финансами прямо из Telegram
        </p>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-lg border",
          message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {isLinked && settings ? (
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl">✅</div>
            <div>
              <div className="font-semibold text-green-700">Telegram подключен</div>
              <div className="text-muted-foreground">
                @{settings.telegram_username || "без username"}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4 bg-muted rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-medium">{settings.telegram_user_id}</span>
            </div>
            {settings.telegram_linked_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Подключено:</span>
                <span className="font-medium">
                  {new Date(settings.telegram_linked_at).toLocaleDateString("ru-RU")}
                </span>
              </div>
            )}
          </div>

          <Button variant="destructive" onClick={unlinkTelegram}>
            Отвязать аккаунт
          </Button>

          <div className="mt-6">
            <h3 className="font-medium mb-3">📱 Доступные команды:</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <code className="bg-background px-2 py-1 rounded text-sm">/balance</code>
                <span className="text-sm text-muted-foreground">Показать баланс</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <code className="bg-background px-2 py-1 rounded text-sm">/stats</code>
                <span className="text-sm text-muted-foreground">Статистика за месяц</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <code className="bg-background px-2 py-1 rounded text-sm">/budgets</code>
                <span className="text-sm text-muted-foreground">Состояние бюджетов</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <code className="bg-background px-2 py-1 rounded text-sm">/add 500 кофе</code>
                <span className="text-sm text-muted-foreground">Добавить расход</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Также поддерживаются естественные команды: &quot;Покажи баланс&quot;, &quot;Добавь 1000р на продукты&quot;
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold mb-4">🚀 Как подключить:</h3>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div>
                <div className="font-medium">Найдите бота</div>
                <div className="text-sm text-muted-foreground">
                  Откройте Telegram и найдите: <strong>@finapp_tracker_bot</strong>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div>
                <div className="font-medium">Сгенерируйте код</div>
                <div className="text-sm text-muted-foreground">
                  Нажмите кнопку ниже для получения кода привязки
                </div>
              </div>
            </div>

            {linkCode ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-sm text-green-800 mb-2">Ваш код привязки:</div>
                <div className="text-2xl font-bold text-green-900 font-mono">{linkCode}</div>
                <div className="text-sm text-green-700 mt-2">⏱️ Код действителен 10 минут</div>
              </div>
            ) : (
              <Button onClick={generateLinkCode} disabled={generatingCode}>
                {generatingCode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {generatingCode ? "Генерируем..." : "🔗 Сгенерировать код"}
              </Button>
            )}

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div>
                <div className="font-medium">Отправьте код боту</div>
                <div className="text-sm text-muted-foreground">
                  Напишите боту: <code className="bg-muted px-1 rounded">/start {linkCode || "ВАШ_КОД"}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">ℹ️ Информация</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Бот работает через Telegram API</li>
          <li>• Все команды выполняются от вашего имени</li>
          <li>• Данные передаются по защищённому соединению</li>
          <li>• Вы можете отвязать бота в любой момент</li>
        </ul>
      </div>
    </div>
  );
}
