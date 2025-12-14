"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText, Search, Eye } from "lucide-react";
import type { Investment, InvestmentSource } from "@/lib/investors/types";
import { INVESTMENT_STATUS_LABELS } from "@/lib/investors/types";
import { formatMoney } from "@/lib/investors/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface InvestmentsPageProps {
  investments: Investment[];
  sources: InvestmentSource[];
}

export function InvestmentsPage({ investments, sources }: InvestmentsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const filteredInvestments = investments.filter((inv) => {
    if (searchQuery && !inv.investment_number.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (sourceFilter !== "all" && inv.source_id !== sourceFilter) return false;
    return true;
  });

  const totalAmount = filteredInvestments.reduce((sum, inv) => sum + inv.approved_amount, 0);
  const totalInterest = filteredInvestments.reduce((sum, inv) => sum + inv.interest_amount, 0);

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary", requested: "outline", approved: "default", received: "default",
    in_progress: "default", returning: "outline", completed: "secondary", overdue: "destructive", cancelled: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Инвестиции</h1>
          <p className="text-muted-foreground">
            {filteredInvestments.length} инвестиций на сумму {formatMoney(totalAmount)}
          </p>
        </div>
        <Button asChild>
          <Link href="/investors/investments/new">
            <Plus className="mr-2 h-4 w-4" />
            Новая инвестиция
          </Link>
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(INVESTMENT_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Источник" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все источники</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Таблица */}
      {filteredInvestments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Нет инвестиций</h3>
          <p className="text-muted-foreground text-sm mb-4">Создайте первую инвестицию</p>
          <Button asChild>
            <Link href="/investors/investments/new">Создать инвестицию</Link>
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Проценты</TableHead>
                <TableHead>Срок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestments.map((inv) => {
                const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);
                const isOverdue = daysLeft < 0 && inv.status !== "completed";

                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-medium">{inv.investment_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(inv.investment_date).toLocaleDateString("ru-RU")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{inv.source?.name || "—"}</div>
                      {inv.tender && (
                        <div className="text-xs text-muted-foreground">→ {inv.tender.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{formatMoney(inv.approved_amount)}</div>
                      <div className="text-xs text-muted-foreground">{inv.interest_rate}%</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatMoney(inv.interest_amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        Итого: {formatMoney(inv.total_return_amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{new Date(inv.due_date).toLocaleDateString("ru-RU")}</div>
                      <div className={cn(
                        "text-xs",
                        isOverdue ? "text-destructive" : daysLeft <= 7 ? "text-orange-600" : "text-muted-foreground"
                      )}>
                        {isOverdue ? `Просрочка ${Math.abs(daysLeft)} дн.` : `${daysLeft} дн.`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[inv.status] || "secondary"}>
                        {INVESTMENT_STATUS_LABELS[inv.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/investors/investments/${inv.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Итого */}
      {filteredInvestments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Привлечено</div>
            <div className="text-2xl font-bold">{formatMoney(totalAmount)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Проценты</div>
            <div className="text-2xl font-bold text-orange-600">{formatMoney(totalInterest)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">К возврату</div>
            <div className="text-2xl font-bold">{formatMoney(totalAmount + totalInterest)}</div>
          </Card>
        </div>
      )}
    </div>
  );
}
