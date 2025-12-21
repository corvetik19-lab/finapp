"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCheck,
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Loader2,
  Settings,
} from "lucide-react";

type EDOProvider = "sbis" | "diadoc" | "kontur";

interface EDOConfig {
  provider: EDOProvider;
  apiKey: string;
  inn: string;
  kpp?: string;
  isActive: boolean;
}

interface EDOContragent {
  id: string;
  name: string;
  inn: string;
  status: "not_invited" | "invited" | "connected" | "rejected";
  invitedAt?: string;
}

const PROVIDERS = {
  sbis: { name: "СБИС", logo: "🔷" },
  diadoc: { name: "Диадок", logo: "📄" },
  kontur: { name: "Контур.Диадок", logo: "🟢" },
};

const STATUS_CONFIG = {
  not_invited: { label: "Не приглашён", color: "secondary", icon: Clock },
  invited: { label: "Приглашён", color: "warning", icon: Mail },
  connected: { label: "Подключён", color: "success", icon: CheckCircle },
  rejected: { label: "Отклонено", color: "destructive", icon: XCircle },
} as const;

export function EDOIntegration() {
  const [config, setConfig] = useState<EDOConfig>({
    provider: "sbis",
    apiKey: "",
    inn: "",
    kpp: "",
    isActive: false,
  });
  const [contragents, setContragents] = useState<EDOContragent[]>([
    { id: "1", name: "ООО Поставщик 1", inn: "7707123456", status: "connected" },
    { id: "2", name: "ООО Поставщик 2", inn: "7708654321", status: "invited", invitedAt: "2024-01-15" },
    { id: "3", name: "ИП Иванов", inn: "771234567890", status: "not_invited" },
  ]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const handleSaveConfig = async () => {
    setLoading(true);
    // TODO: Сохранить конфигурацию
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleInvite = async (contragentId: string) => {
    setInvitingId(contragentId);
    // TODO: Отправить приглашение
    await new Promise(resolve => setTimeout(resolve, 1000));
    setContragents(prev =>
      prev.map(c =>
        c.id === contragentId
          ? { ...c, status: "invited" as const, invitedAt: new Date().toISOString() }
          : c
      )
    );
    setInvitingId(null);
  };

  const handleSyncStatuses = async () => {
    setLoading(true);
    // TODO: Синхронизация статусов
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  const connectedCount = contragents.filter(c => c.status === "connected").length;
  const invitedCount = contragents.filter(c => c.status === "invited").length;

  return (
    <div className="space-y-6">
      {/* Настройки провайдера */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки ЭДО
          </CardTitle>
          <CardDescription>
            Подключение к системе электронного документооборота
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Провайдер ЭДО</Label>
              <Select
                value={config.provider}
                onValueChange={(v) => setConfig({ ...config, provider: v as EDOProvider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDERS).map(([key, { name, logo }]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{logo}</span>
                        {name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API ключ</Label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Введите API ключ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inn">ИНН организации</Label>
              <Input
                id="inn"
                value={config.inn}
                onChange={(e) => setConfig({ ...config, inn: e.target.value })}
                placeholder="7707123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpp">КПП</Label>
              <Input
                id="kpp"
                value={config.kpp}
                onChange={(e) => setConfig({ ...config, kpp: e.target.value })}
                placeholder="770701001"
              />
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Сохранить настройки
          </Button>
        </CardContent>
      </Card>

      {/* Статус подключения контрагентов */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Контрагенты ЭДО
              </CardTitle>
              <CardDescription>
                Статус подключения поставщиков к электронному документообороту
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleSyncStatuses} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Обновить статусы
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
              <div className="text-sm text-muted-foreground">Подключено</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{invitedCount}</div>
              <div className="text-sm text-muted-foreground">Ожидают подключения</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold">{contragents.length}</div>
              <div className="text-sm text-muted-foreground">Всего контрагентов</div>
            </div>
          </div>

          {/* Таблица контрагентов */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Контрагент</TableHead>
                <TableHead>ИНН</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата приглашения</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contragents.map((contragent) => {
                const statusConfig = STATUS_CONFIG[contragent.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <TableRow key={contragent.id}>
                    <TableCell className="font-medium">{contragent.name}</TableCell>
                    <TableCell className="font-mono">{contragent.inn}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={statusConfig.color === "success" ? "default" : 
                                statusConfig.color === "warning" ? "secondary" : 
                                statusConfig.color === "destructive" ? "destructive" : "outline"}
                        className="gap-1"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contragent.invitedAt
                        ? new Date(contragent.invitedAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {contragent.status === "not_invited" && (
                        <Button
                          size="sm"
                          onClick={() => handleInvite(contragent.id)}
                          disabled={invitingId === contragent.id}
                        >
                          {invitingId === contragent.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Пригласить
                        </Button>
                      )}
                      {contragent.status === "connected" && (
                        <Button size="sm" variant="outline">
                          <FileCheck className="h-4 w-4 mr-2" />
                          Документы
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
