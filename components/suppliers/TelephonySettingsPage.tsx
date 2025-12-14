"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Phone,
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { MangoSettings } from "@/lib/suppliers/types";
import { saveMangoSettings } from "@/lib/suppliers/service";

interface TelephonySettingsPageProps {
  settings: MangoSettings | null;
}

export function TelephonySettingsPage({ settings }: TelephonySettingsPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [apiKey, setApiKey] = useState(settings?.api_key || "");
  const [apiSalt, setApiSalt] = useState(settings?.api_salt || "");
  const [isEnabled, setIsEnabled] = useState(settings?.is_enabled ?? true);
  const [recordCalls, setRecordCalls] = useState(settings?.record_calls ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiSalt) return;

    setIsLoading(true);
    try {
      await saveMangoSettings({
        api_key: apiKey,
        api_salt: apiSalt,
        is_enabled: isEnabled,
        record_calls: recordCalls,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      router.refresh();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isConfigured = Boolean(settings?.api_key && settings?.api_salt);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки телефонии</h1>
        <p className="text-muted-foreground">
          Интеграция с Mango Office для звонков
        </p>
      </div>

      {/* Статус подключения */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Статус подключения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isConfigured && settings?.is_enabled ? (
              <>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Подключено</p>
                  <p className="text-sm text-muted-foreground">
                    Mango Office настроен и активен
                  </p>
                </div>
                <Badge variant="default" className="ml-auto">
                  Активно
                </Badge>
              </>
            ) : isConfigured ? (
              <>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Отключено</p>
                  <p className="text-sm text-muted-foreground">
                    Mango Office настроен, но отключен
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  Неактивно
                </Badge>
              </>
            ) : (
              <>
                <div className="p-2 bg-gray-100 rounded-full">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Не настроено</p>
                  <p className="text-sm text-muted-foreground">
                    Введите API ключи для подключения
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Требуется настройка
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Инструкция */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Для настройки интеграции вам нужны API ключи из личного кабинета Mango
          Office. Перейдите в{" "}
          <a
            href="https://lk.mango-office.ru/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline inline-flex items-center gap-1"
          >
            Настройки → API
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          и скопируйте ключ API и подпись.
        </AlertDescription>
      </Alert>

      {/* Форма настроек */}
      <Card>
        <CardHeader>
          <CardTitle>API настройки Mango Office</CardTitle>
          <CardDescription>
            Введите данные для подключения к API Mango Office
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API ключ (vpbx_api_key)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Введите API ключ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiSalt">Подпись (sign)</Label>
                <Input
                  id="apiSalt"
                  type="password"
                  value={apiSalt}
                  onChange={(e) => setApiSalt(e.target.value)}
                  placeholder="Введите подпись"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Включить интеграцию</Label>
                  <p className="text-sm text-muted-foreground">
                    Активировать функции телефонии
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Записывать звонки</Label>
                  <p className="text-sm text-muted-foreground">
                    Сохранять записи разговоров
                  </p>
                </div>
                <Switch checked={recordCalls} onCheckedChange={setRecordCalls} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isLoading || !apiKey || !apiSalt}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить
              </Button>
              {isSaved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Сохранено
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Webhook */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook для входящих событий</CardTitle>
            <CardDescription>
              Настройте этот URL в личном кабинете Mango Office для получения
              уведомлений о звонках
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>URL для Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/telephony/mango/webhook`}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/api/telephony/mango/webhook`
                      );
                    }}
                  >
                    Копировать
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Добавьте этот URL в настройках API Mango Office в разделе
                &quot;События по звонкам&quot;
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
