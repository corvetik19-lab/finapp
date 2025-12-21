"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Search, Filter, ArrowUpDown, Eye } from "lucide-react";

interface Investment {
  id: string;
  investment_number: string;
  approved_amount: number;
  total_return_amount: number;
  returned_principal: number;
  returned_interest: number;
  status: string;
  due_date: string;
  interest_rate: number;
  created_at: string;
  source?: { id: string; name: string; source_type: string } | null;
  tender?: { id: string; subject: string; purchase_number: string; status: string } | null;
}

interface Props {
  investments: Investment[];
}

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  pending: "Ожидает",
  active: "Активная",
  in_progress: "В работе",
  completed: "Завершена",
  overdue: "Просрочена",
  cancelled: "Отменена",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  pending: "outline",
  active: "default",
  in_progress: "default",
  completed: "secondary",
  overdue: "destructive",
  cancelled: "secondary",
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

export function InvestorInvestmentsList({ investments }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "due">("date");

  const filtered = investments
    .filter((inv) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !inv.investment_number.toLowerCase().includes(q) &&
          !inv.tender?.subject?.toLowerCase().includes(q) &&
          !inv.source?.name?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter !== "all" && inv.status !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "amount") {
        return b.approved_amount - a.approved_amount;
      }
      if (sortBy === "due") {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Мои инвестиции</h1>
        <p className="text-muted-foreground">
          Всего {investments.length} инвестиций
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру, тендеру, источнику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Завершённые</SelectItem>
                <SelectItem value="overdue">Просроченные</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате создания</SelectItem>
                <SelectItem value="amount">По сумме</SelectItem>
                <SelectItem value="due">По сроку возврата</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Инвестиции не найдены
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((inv) => {
            const returned = (inv.returned_principal || 0) + (inv.returned_interest || 0);
            const remaining = inv.total_return_amount - returned;
            const progress = inv.total_return_amount > 0
              ? Math.round((returned / inv.total_return_amount) * 100)
              : 0;

            return (
              <Card key={inv.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{inv.investment_number}</h3>
                        <Badge variant={statusColors[inv.status] || "secondary"}>
                          {statusLabels[inv.status] || inv.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        {inv.tender?.subject || "Без привязки к тендеру"}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Источник: {inv.source?.name || "—"}</span>
                        <span>Ставка: {inv.interest_rate}%</span>
                        <span>Срок: {formatDate(inv.due_date)}</span>
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="flex flex-col items-end gap-1 min-w-[200px]">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Инвестировано</p>
                        <p className="font-semibold">{formatMoney(inv.approved_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">К возврату</p>
                        <p className="font-semibold text-green-600">
                          {formatMoney(inv.total_return_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-full md:w-[150px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Возвращено</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Остаток: {formatMoney(remaining)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/investor-portal/investments/${inv.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Подробнее
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
