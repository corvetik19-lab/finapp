"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast/ToastContext";
import {
  FileCheck,
  Plus,
  Send,
  Calendar,
  Download,
} from "lucide-react";

interface ReconciliationAct {
  id: string;
  investment_id: string;
  investment_number: string;
  investor_name: string;
  act_number: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_invested: number;
  total_returned: number;
  closing_balance: number;
  status: "draft" | "sent" | "confirmed" | "disputed";
}

interface Investment {
  id: string;
  investment_number: string;
  source_name: string;
}

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  sent: "Отправлен",
  confirmed: "Подтверждён",
  disputed: "Оспорен",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  confirmed: "default",
  disputed: "destructive",
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru-RU");
}

export function ReconciliationPageClient() {
  const { show } = useToast();
  const [acts, setActs] = useState<ReconciliationAct[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newAct, setNewAct] = useState({
    investment_id: "",
    period_start: "",
    period_end: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [actsRes, invRes] = await Promise.all([
        fetch("/api/investors/reconciliation"),
        fetch("/api/investors/investments?status=active,in_progress,completed"),
      ]);

      if (actsRes.ok) {
        const { data } = await actsRes.json();
        setActs(data || []);
      }

      if (invRes.ok) {
        const { data } = await invRes.json();
        setInvestments(
          (data || []).map((inv: { id: string; investment_number: string; source?: { name: string } }) => ({
            id: inv.id,
            investment_number: inv.investment_number,
            source_name: inv.source?.name || "—",
          }))
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAct.investment_id || !newAct.period_start || !newAct.period_end) {
      show("Заполните все поля", { type: "error" });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/investors/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAct),
      });

      if (response.ok) {
        show("Акт сверки создан", { type: "success" });
        setDialogOpen(false);
        setNewAct({ investment_id: "", period_start: "", period_end: "" });
        loadData();
      } else {
        throw new Error("Failed to create");
      }
    } catch {
      show("Ошибка создания акта", { type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (actId: string) => {
    try {
      const response = await fetch(`/api/investors/reconciliation/${actId}/send`, {
        method: "POST",
      });

      if (response.ok) {
        show("Акт отправлен инвестору", { type: "success" });
        loadData();
      }
    } catch {
      show("Ошибка отправки", { type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Акты сверки</h1>
          <p className="text-muted-foreground">
            Генерация и отправка актов сверки инвесторам
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Инвестиция</Label>
                <Select
                  value={newAct.investment_id}
                  onValueChange={(v) => setNewAct({ ...newAct, investment_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите инвестицию" />
                  </SelectTrigger>
                  <SelectContent>
                    {investments.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.investment_number} — {inv.source_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Начало периода</Label>
                  <Input
                    type="date"
                    value={newAct.period_start}
                    onChange={(e) => setNewAct({ ...newAct, period_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Конец периода</Label>
                  <Input
                    type="date"
                    value={newAct.period_end}
                    onChange={(e) => setNewAct({ ...newAct, period_end: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? "Создание..." : "Создать акт"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего актов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Черновики</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {acts.filter((a) => a.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ожидают подтверждения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {acts.filter((a) => a.status === "sent").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Подтверждены</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {acts.filter((a) => a.status === "confirmed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acts List */}
      {acts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium">Нет актов сверки</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первый акт сверки для инвестора
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать акт
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {acts.map((act) => (
            <Card key={act.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{act.act_number}</h3>
                      <Badge variant={statusColors[act.status]}>
                        {statusLabels[act.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {act.investment_number} — {act.investor_name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Период: {formatDate(act.period_start)} — {formatDate(act.period_end)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Сальдо на конец</p>
                    <p className="text-xl font-bold">
                      {formatMoney(act.closing_balance)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Начальное сальдо</p>
                    <p className="font-medium">{formatMoney(act.opening_balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Инвестировано</p>
                    <p className="font-medium text-blue-600">
                      +{formatMoney(act.total_invested)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Возвращено</p>
                    <p className="font-medium text-green-600">
                      -{formatMoney(act.total_returned)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Конечное сальдо</p>
                    <p className="font-medium">{formatMoney(act.closing_balance)}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Скачать PDF
                  </Button>
                  {act.status === "draft" && (
                    <Button size="sm" onClick={() => handleSend(act.id)}>
                      <Send className="h-4 w-4 mr-2" />
                      Отправить
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
