"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Plus, 
  Search, 
  Scale, 
  Eye,
  CheckCircle,
  AlertTriangle,
  Send,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReconciliationAct, ReconciliationStatus } from "@/lib/accounting/documents/types";
import { AccountingCounterparty } from "@/lib/accounting/types";
import { formatMoney } from "@/lib/accounting/types";
import { createReconciliationAct } from "@/lib/accounting/documents/reconciliation-service";

interface ReconciliationActsPageProps {
  acts: ReconciliationAct[];
  counterparties: AccountingCounterparty[];
}

const statusLabels: Record<ReconciliationStatus, string> = {
  draft: "Черновик",
  sent: "Отправлен",
  confirmed: "Подтверждён",
  disputed: "Оспаривается",
};

const statusColors: Record<ReconciliationStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
};

const statusIcons: Record<ReconciliationStatus, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  confirmed: <CheckCircle className="h-3 w-3" />,
  disputed: <AlertTriangle className="h-3 w-3" />,
};

export function ReconciliationActsPage({ acts, counterparties }: ReconciliationActsPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAct, setNewAct] = useState({
    counterparty_id: "",
    period_start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0],
    period_end: new Date().toISOString().split("T")[0],
  });

  const filteredActs = acts.filter((act) => {
    const counterpartyName = act.counterparty?.name || "";
    const matchesSearch =
      !searchQuery ||
      counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.act_number.toString().includes(searchQuery);

    const matchesStatus = statusFilter === "all" || act.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: acts.length,
    draft: acts.filter((a) => a.status === "draft").length,
    sent: acts.filter((a) => a.status === "sent").length,
    confirmed: acts.filter((a) => a.status === "confirmed").length,
    disputed: acts.filter((a) => a.status === "disputed").length,
  };

  const handleCreate = async () => {
    if (!newAct.counterparty_id) return;

    setIsCreating(true);
    try {
      const result = await createReconciliationAct({
        counterparty_id: newAct.counterparty_id,
        period_start: newAct.period_start,
        period_end: newAct.period_end,
      });

      if (result.success && result.id) {
        setIsCreateOpen(false);
        router.push(`/tenders/accounting/reconciliation-acts/${result.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Акты сверки</h1>
          <p className="text-muted-foreground">Сверка взаиморасчётов с контрагентами</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать акт
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый акт сверки</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Контрагент</Label>
                <Select
                  value={newAct.counterparty_id}
                  onValueChange={(v) => setNewAct({ ...newAct, counterparty_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите контрагента" />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Период с</Label>
                  <Input
                    type="date"
                    value={newAct.period_start}
                    onChange={(e) => setNewAct({ ...newAct, period_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Период по</Label>
                  <Input
                    type="date"
                    value={newAct.period_end}
                    onChange={(e) => setNewAct({ ...newAct, period_end: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newAct.counterparty_id || isCreating}
                className="w-full"
              >
                {isCreating ? "Создание..." : "Создать акт сверки"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Всего</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Черновики</div>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Отправлено</div>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Подтверждено</div>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Оспаривается</div>
            <div className="text-2xl font-bold text-red-600">{stats.disputed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по контрагенту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Все
              </Button>
              {(Object.keys(statusLabels) as ReconciliationStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {statusLabels[status]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список актов сверки</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Акты сверки не найдены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">Наш дебет</TableHead>
                  <TableHead className="text-right">Наш кредит</TableHead>
                  <TableHead className="text-right">Сальдо</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActs.map((act) => {
                  const saldo = act.closing_balance_debit - act.closing_balance_credit;
                  return (
                    <TableRow key={act.id}>
                      <TableCell className="font-medium">{act.act_number}</TableCell>
                      <TableCell>
                        <div>{act.counterparty?.name || "—"}</div>
                        {act.counterparty?.inn && (
                          <div className="text-xs text-muted-foreground">
                            ИНН: {act.counterparty.inn}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(act.period_start).toLocaleDateString("ru-RU")} —{" "}
                          {new Date(act.period_end).toLocaleDateString("ru-RU")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(act.our_debit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(act.our_credit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {saldo >= 0 ? (
                          <span className="text-green-600">
                            Нам должны: {formatMoney(saldo)}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            Мы должны: {formatMoney(Math.abs(saldo))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[act.status]}>
                          <span className="flex items-center gap-1">
                            {statusIcons[act.status]}
                            {statusLabels[act.status]}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tenders/accounting/reconciliation-acts/${act.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
