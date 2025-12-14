"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Send,
  FileCheck,
  FileX,
  Clock,
  Settings,
  RefreshCw,
  Shield,
  Zap,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import type { EdiSettings, EdiDocument } from "@/lib/accounting/edi/types";
import type { EdiStats } from "@/lib/accounting/edi/diadoc-service";

interface EdiDashboardProps {
  settings: EdiSettings | null;
  stats: EdiStats;
  documents: EdiDocument[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    draft: { label: "Черновик", variant: "outline", icon: <Clock className="h-3 w-3" /> },
    sent: { label: "Отправлен", variant: "secondary", icon: <Send className="h-3 w-3" /> },
    delivered: { label: "Доставлен", variant: "secondary", icon: <CheckCircle className="h-3 w-3" /> },
    signed: { label: "Подписан", variant: "default", icon: <FileCheck className="h-3 w-3" /> },
    rejected: { label: "Отклонён", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    revoked: { label: "Аннулирован", variant: "destructive", icon: <FileX className="h-3 w-3" /> },
    error: { label: "Ошибка", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  };
  const info = statusMap[status] || { label: status, variant: "outline" as const, icon: null };
  return (
    <Badge variant={info.variant} className="gap-1">
      {info.icon}
      {info.label}
    </Badge>
  );
}

export function EdiDashboard({ settings, stats, documents }: EdiDashboardProps) {
  const { show } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(settings?.api_key || "");
  const [login, setLogin] = useState(settings?.login || "");
  const [autoSign, setAutoSign] = useState(settings?.auto_sign || false);

  const handleSaveSettings = async () => {
    // TODO: Сохранение настроек через Server Action
    show("Настройки сохранены", { type: "success" });
    setIsSettingsOpen(false);
  };

  const isConfigured = settings?.api_key && settings?.box_id;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary" />
              Электронный документооборот
            </h1>
            <p className="text-muted-foreground">
              Обмен документами через Диадок
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Настройки ЭДО</DialogTitle>
                <DialogDescription>
                  Подключение к сервису Диадок
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>API ключ Диадок</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Введите API ключ"
                  />
                  <p className="text-xs text-muted-foreground">
                    Получите ключ в личном кабинете Диадок
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Логин</Label>
                  <Input
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Пароль</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Автоподпись входящих</Label>
                      <p className="text-xs text-muted-foreground">
                        Автоматически подписывать входящие документы
                      </p>
                    </div>
                    <Switch
                      checked={autoSign}
                      onCheckedChange={setAutoSign}
                    />
                  </div>
                </div>
                
                {settings?.certificate_thumbprint && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Сертификат подключён</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {settings.certificate_subject}
                    </p>
                  </div>
                )}
                
                <Button onClick={handleSaveSettings} className="w-full">
                  Сохранить настройки
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Connection Status */}
      {!isConfigured && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  ЭДО не настроен
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Для отправки и получения документов настройте подключение к Диадок
                </p>
              </div>
              <Button 
                variant="outline" 
                className="ml-auto"
                onClick={() => setIsSettingsOpen(true)}
              >
                Настроить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего документов</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Отправлено</p>
                <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Подписано</p>
                <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ожидают подписи</p>
                <p className={`text-2xl font-bold ${stats.pending > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {stats.pending}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                stats.pending > 0 ? 'bg-orange-100' : 'bg-muted'
              }`}>
                <Clock className={`h-6 w-6 ${stats.pending > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Все документы</TabsTrigger>
          <TabsTrigger value="incoming">Входящие</TabsTrigger>
          <TabsTrigger value="outgoing">Исходящие</TabsTrigger>
          <TabsTrigger value="pending">Ожидают подписи</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Документы ЭДО</CardTitle>
              <CardDescription>
                История обмена документами
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Номер</TableHead>
                      <TableHead>Контрагент</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{formatDate(doc.document_date)}</TableCell>
                        <TableCell className="uppercase text-xs font-medium">
                          {doc.document_type}
                        </TableCell>
                        <TableCell className="font-mono">
                          {doc.document_number || "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.counterparty_name || "—"}</div>
                            {doc.counterparty_inn && (
                              <div className="text-xs text-muted-foreground">
                                ИНН: {doc.counterparty_inn}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.total ? formatMoney(doc.total) : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Открыть
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет документов ЭДО</p>
                  <p className="text-sm mt-2">
                    Отправьте документ контрагенту через ЭДО
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incoming">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Входящие документы появятся после настройки ЭДО
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Исходящие документы появятся после отправки
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Нет документов, ожидающих подписи
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link href="/tenders/accounting/documents">
                <FileText className="h-4 w-4 mr-2" />
                Документы
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tenders/accounting/counterparties">
                <Settings className="h-4 w-4 mr-2" />
                Контрагенты
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
