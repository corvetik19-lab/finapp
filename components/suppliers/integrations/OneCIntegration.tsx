"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Badge может использоваться для индикации статуса
// import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
} from "lucide-react";

interface OneCConfig {
  baseUrl: string;
  username: string;
  password: string;
  database: string;
  syncDirection: "to_1c" | "from_1c" | "bidirectional";
  syncInterval?: number;
  lastSyncAt?: string;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  syncedAt: string;
}

export function OneCIntegration() {
  const [config, setConfig] = useState<OneCConfig>({
    baseUrl: "",
    username: "",
    password: "",
    database: "",
    syncDirection: "bidirectional",
    syncInterval: 60,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [showPassword] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    // Загрузка конфигурации
    loadConfig();
  }, []);

  const loadConfig = async () => {
    // TODO: Загрузить конфигурацию с сервера
  };

  const handleSave = async () => {
    // TODO: Сохранить конфигурацию
    setIsConfigured(true);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // TODO: Вызов синхронизации
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLastSync({
        success: true,
        created: 5,
        updated: 12,
        errors: [],
        syncedAt: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    // TODO: Тест подключения
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Интеграция с 1С
          </CardTitle>
          <CardDescription>
            Синхронизация справочника контрагентов с 1С:Предприятие
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Статус подключения */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">
                  {isConfigured ? "Подключено" : "Не настроено"}
                </div>
                {lastSync && (
                  <div className="text-sm text-muted-foreground">
                    Последняя синхронизация:{" "}
                    {new Date(lastSync.syncedAt).toLocaleString("ru-RU")}
                  </div>
                )}
              </div>
            </div>
            {isConfigured && (
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Синхронизировать
              </Button>
            )}
          </div>

          {/* Результат синхронизации */}
          {lastSync && (
            <div className={`p-4 border rounded-lg ${
              lastSync.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {lastSync.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">
                  {lastSync.success ? "Синхронизация успешна" : "Ошибка синхронизации"}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span>Создано: {lastSync.created}</span>
                <span>Обновлено: {lastSync.updated}</span>
                {lastSync.errors.length > 0 && (
                  <span className="text-red-600">Ошибок: {lastSync.errors.length}</span>
                )}
              </div>
            </div>
          )}

          {/* Настройки подключения */}
          <div className="space-y-4">
            <h3 className="font-medium">Настройки подключения</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL сервера 1С</Label>
                <Input
                  id="baseUrl"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="http://server:8080/base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="database">База данных</Label>
                <Input
                  id="database"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  placeholder="Бухгалтерия"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Пользователь</Label>
                <Input
                  id="username"
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  placeholder="Администратор"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Направление синхронизации</Label>
              <Select
                value={config.syncDirection}
                onValueChange={(v) => setConfig({ ...config, syncDirection: v as OneCConfig["syncDirection"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from_1c">
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine className="h-4 w-4" />
                      Из 1С в систему
                    </div>
                  </SelectItem>
                  <SelectItem value="to_1c">
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-4 w-4" />
                      Из системы в 1С
                    </div>
                  </SelectItem>
                  <SelectItem value="bidirectional">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Двусторонняя
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматическая синхронизация</Label>
                <div className="text-sm text-muted-foreground">
                  Синхронизировать каждые {config.syncInterval} минут
                </div>
              </div>
              <Switch
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTestConnection} variant="outline">
                Проверить подключение
              </Button>
              <Button onClick={handleSave}>
                Сохранить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
