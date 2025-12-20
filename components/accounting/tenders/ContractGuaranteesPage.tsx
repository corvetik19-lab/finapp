"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Shield, AlertTriangle, Wallet } from "lucide-react";

type GuaranteeType = "application" | "contract" | "advance" | "warranty";
type GuaranteeStatus = "active" | "returned" | "forfeited" | "expired";

interface ContractGuarantee {
  id: string;
  tender_id: string;
  guarantee_type: GuaranteeType;
  guarantee_form: "deposit" | "bank_guarantee" | "surety";
  amount: number;
  issue_date: string;
  expiry_date: string;
  bank_name?: string;
  guarantee_number?: string;
  status: GuaranteeStatus;
  return_date?: string;
  notes?: string;
}

interface ContractGuaranteesPageProps {
  tenderId: string;
  tenderName: string;
  guarantees: ContractGuarantee[];
}

const typeLabels: Record<GuaranteeType, string> = {
  application: "Обеспечение заявки",
  contract: "Обеспечение контракта",
  advance: "Обеспечение аванса",
  warranty: "Гарантийные обязательства",
};

const formLabels: Record<string, string> = {
  deposit: "Денежный депозит",
  bank_guarantee: "Банковская гарантия",
  surety: "Поручительство",
};

const statusLabels: Record<GuaranteeStatus, { label: string; color: string }> = {
  active: { label: "Действует", color: "bg-blue-100 text-blue-700" },
  returned: { label: "Возвращено", color: "bg-emerald-100 text-emerald-700" },
  forfeited: { label: "Удержано", color: "bg-red-100 text-red-700" },
  expired: { label: "Истекло", color: "bg-gray-100 text-gray-700" },
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

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ContractGuaranteesPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tenderId,
  tenderName,
  guarantees,
}: ContractGuaranteesPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const activeGuarantees = guarantees.filter((g) => g.status === "active");
  const totalActive = activeGuarantees.reduce((sum, g) => sum + g.amount, 0);
  const expiringCount = activeGuarantees.filter(
    (g) => getDaysUntil(g.expiry_date) <= 30 && getDaysUntil(g.expiry_date) > 0
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Обеспечения контракта</h1>
          <p className="text-muted-foreground">{tenderName}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить обеспечение
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новое обеспечение</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип обеспечения</Label>
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
                  <Label>Форма обеспечения</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите форму" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(formLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
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
                  <Label>Срок действия до</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Банк / Номер гарантии</Label>
                <Input placeholder="Наименование банка, номер БГ" />
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
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего</div>
                <div className="text-2xl font-bold">{guarantees.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Действующих</div>
            <div className="text-2xl font-bold text-blue-600">{activeGuarantees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Сумма активных</div>
            <div className="text-2xl font-bold">{formatMoney(totalActive)} ₽</div>
          </CardContent>
        </Card>
        <Card className={expiringCount > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Истекает скоро
            </div>
            <div className="text-2xl font-bold text-amber-600">{expiringCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Обеспечения
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Форма</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Срок до</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Банк / № гарантии</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guarantees.map((g) => {
                const daysLeft = getDaysUntil(g.expiry_date);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {typeLabels[g.guarantee_type]}
                    </TableCell>
                    <TableCell>{formLabels[g.guarantee_form]}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(g.amount)} ₽
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatDate(g.expiry_date)}
                        {g.status === "active" && daysLeft <= 30 && daysLeft > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            {daysLeft} дн.
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusLabels[g.status]?.color}>
                        {statusLabels[g.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {g.bank_name && <div>{g.bank_name}</div>}
                      {g.guarantee_number && <div>№ {g.guarantee_number}</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {guarantees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Обеспечения не добавлены</p>
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
