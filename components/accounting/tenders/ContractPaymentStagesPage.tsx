"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Calendar, CheckCircle, Clock, Banknote } from "lucide-react";

interface PaymentStage {
  id: string;
  tender_id: string;
  stage_number: number;
  name: string;
  amount: number;
  due_date: string;
  status: "pending" | "invoiced" | "paid" | "overdue";
  paid_date?: string;
  paid_amount?: number;
  notes?: string;
}

interface ContractPaymentStagesPageProps {
  tenderId: string;
  tenderName: string;
  contractAmount: number;
  stages: PaymentStage[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-gray-100 text-gray-700" },
  invoiced: { label: "Выставлен счёт", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Оплачено", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Просрочено", color: "bg-red-100 text-red-700" },
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

export function ContractPaymentStagesPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tenderId,
  tenderName,
  contractAmount,
  stages,
}: ContractPaymentStagesPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const paidAmount = stages
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + (s.paid_amount || s.amount), 0);
  const pendingAmount = stages
    .filter((s) => s.status !== "paid")
    .reduce((sum, s) => sum + s.amount, 0);
  const paidPercent = contractAmount > 0 ? (paidAmount / contractAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Этапы оплаты контракта</h1>
          <p className="text-muted-foreground">{tenderName}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить этап
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый этап оплаты</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название этапа</Label>
                <Input placeholder="Аванс / Промежуточный платёж / Окончательный расчёт" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Сумма</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Срок оплаты</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Примечание</Label>
                <Input placeholder="Условия оплаты..." />
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
            <div className="text-sm text-muted-foreground">Сумма контракта</div>
            <div className="text-2xl font-bold">{formatMoney(contractAmount)} ₽</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Оплачено
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(paidAmount)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              Ожидается
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {formatMoney(pendingAmount)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Этапов</div>
            <div className="text-2xl font-bold">{stages.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Прогресс оплаты</span>
            <span className="text-sm font-medium">{paidPercent.toFixed(1)}%</span>
          </div>
          <Progress value={paidPercent} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Этапы оплаты
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">№</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Срок оплаты</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Оплачено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="font-medium">{stage.stage_number}</TableCell>
                  <TableCell>{stage.name}</TableCell>
                  <TableCell>{formatDate(stage.due_date)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(stage.amount)} ₽
                  </TableCell>
                  <TableCell>
                    <Badge className={statusLabels[stage.status]?.color}>
                      {statusLabels[stage.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {stage.paid_date ? (
                      <div className="text-sm">
                        <div className="text-emerald-600 font-medium">
                          {formatMoney(stage.paid_amount || stage.amount)} ₽
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatDate(stage.paid_date)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {stages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Этапы оплаты не добавлены</p>
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
