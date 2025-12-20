"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, AlertTriangle, ArrowDown, ArrowUp, Scale } from "lucide-react";

type PenaltyType = "penalty" | "fine" | "neustoyka";
type PenaltyDirection = "incoming" | "outgoing";
type PenaltyStatus = "accrued" | "paid" | "disputed" | "cancelled";

interface Penalty {
  id: string;
  tender_id: string;
  penalty_type: PenaltyType;
  direction: PenaltyDirection;
  amount: number;
  accrual_date: string;
  due_date?: string;
  reason: string;
  status: PenaltyStatus;
  paid_date?: string;
  paid_amount?: number;
  document_number?: string;
  notes?: string;
}

interface PenaltiesPageProps {
  tenderId: string;
  tenderName: string;
  penalties: Penalty[];
}

const typeLabels: Record<PenaltyType, string> = {
  penalty: "Пеня",
  fine: "Штраф",
  neustoyka: "Неустойка",
};

const statusLabels: Record<PenaltyStatus, { label: string; color: string }> = {
  accrued: { label: "Начислено", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Оплачено", color: "bg-emerald-100 text-emerald-700" },
  disputed: { label: "Оспаривается", color: "bg-purple-100 text-purple-700" },
  cancelled: { label: "Отменено", color: "bg-gray-100 text-gray-700" },
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

export function PenaltiesPage({ tenderId: _tenderId, tenderName, penalties }: PenaltiesPageProps) {
  void _tenderId;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const incomingTotal = penalties
    .filter((p) => p.direction === "incoming" && p.status !== "cancelled")
    .reduce((sum, p) => sum + p.amount, 0);
  const outgoingTotal = penalties
    .filter((p) => p.direction === "outgoing" && p.status !== "cancelled")
    .reduce((sum, p) => sum + p.amount, 0);
  const unpaidCount = penalties.filter((p) => p.status === "accrued").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пени и штрафы</h1>
          <p className="text-muted-foreground">{tenderName}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая пеня / штраф</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Направление</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">Нам (получаем)</SelectItem>
                      <SelectItem value="outgoing">От нас (платим)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Сумма</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Дата начисления</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Основание</Label>
                <Textarea placeholder="Причина начисления пени/штрафа..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Добавить</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего записей</div>
                <div className="text-2xl font-bold">{penalties.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-emerald-500" />
              Получаем (входящие)
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(incomingTotal)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-red-500" />
              Платим (исходящие)
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(outgoingTotal)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Не оплачено</div>
            <div className="text-2xl font-bold text-amber-600">{unpaidCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Пени и штрафы
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Основание</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penalties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.direction === "incoming" ? (
                      <ArrowDown className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{typeLabels[p.penalty_type]}</TableCell>
                  <TableCell>{formatDate(p.accrual_date)}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={p.direction === "incoming" ? "text-emerald-600" : "text-red-600"}>
                      {p.direction === "incoming" ? "+" : "−"}
                      {formatMoney(p.amount)} ₽
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {p.reason}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusLabels[p.status]?.color}>
                      {statusLabels[p.status]?.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {penalties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Пени и штрафы отсутствуют</p>
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
