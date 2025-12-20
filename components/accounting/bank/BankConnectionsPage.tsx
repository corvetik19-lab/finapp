"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Globe, RefreshCw, MoreVertical, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { BankIntegration, BANKS, INTEGRATION_STATUSES } from "@/lib/accounting/bank-types";

interface BankConnectionsPageProps {
  connections: BankIntegration[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "error":
    case "expired":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
}

export function BankConnectionsPage({ connections }: BankConnectionsPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const activeCount = connections.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Банковские подключения</h1>
          <p className="text-muted-foreground">
            Интеграции с банками для автоматического импорта выписок
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Подключить банк
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Подключение банка</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Выберите банк</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BANKS)
                      .filter(([, info]) => info.hasApi)
                      .map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          {info.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">Как это работает:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Выберите банк из списка</li>
                  <li>Вы будете перенаправлены на страницу банка</li>
                  <li>Авторизуйтесь и предоставьте доступ</li>
                  <li>Выписки будут загружаться автоматически</li>
                </ol>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Продолжить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Подключений</div>
                <div className="text-2xl font-bold">{connections.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Активных</div>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Требуют внимания</div>
            <div className="text-2xl font-bold text-amber-600">
              {connections.filter((c) => c.status === "error" || c.status === "expired").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Подключения к банкам
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Банк</TableHead>
                <TableHead>Тип интеграции</TableHead>
                <TableHead>Последняя синхр.</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>
                    <div className="font-medium">
                      {BANKS[conn.bank_code]?.name || conn.bank_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {conn.linked_account_ids?.length || 0} счетов
                    </div>
                  </TableCell>
                  <TableCell>
                    {conn.integration_type === "api" ? "API банка" : 
                     conn.integration_type === "1c" ? "1С Клиент-банк" : "Ручной ввод"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(conn.last_sync_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(conn.status)}
                      <Badge
                        variant={conn.status === "active" ? "default" : "secondary"}
                        style={{ 
                          backgroundColor: INTEGRATION_STATUSES[conn.status]?.color + "20",
                          color: INTEGRATION_STATUSES[conn.status]?.color,
                        }}
                      >
                        {INTEGRATION_STATUSES[conn.status]?.name || conn.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Синхронизировать
                        </DropdownMenuItem>
                        <DropdownMenuItem>Настройки</DropdownMenuItem>
                        <DropdownMenuItem>Логи</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Отключить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {connections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет подключённых банков</p>
                    <p className="text-sm">Подключите банк для автоматического импорта выписок</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
