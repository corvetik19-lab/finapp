"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Building2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/lib/investors/calculations";
import {
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_STATUS_LABELS,
} from "@/lib/investors/types";
import type { BankGuarantee, GuaranteeType, GuaranteeStatus } from "@/lib/investors/types";
import type { GuaranteeStats } from "@/lib/investors/guarantees";

interface GuaranteesClientProps {
  initialGuarantees: BankGuarantee[];
  stats: GuaranteeStats;
}

export function GuaranteesClient({ initialGuarantees, stats }: GuaranteesClientProps) {
  const [guarantees] = useState<BankGuarantee[]>(initialGuarantees);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredGuarantees = guarantees.filter((g) => {
    const matchesSearch =
      !search ||
      g.guarantee_number?.toLowerCase().includes(search.toLowerCase()) ||
      g.bank_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.tender?.subject?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || g.guarantee_type === typeFilter;
    const matchesStatus = statusFilter === "all" || g.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    pending: "outline",
    active: "default",
    expired: "secondary",
    claimed: "destructive",
    returned: "secondary",
  };

  const getDaysUntilExpiry = (endDate: string): number => {
    return Math.ceil(
      (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Банковские гарантии
          </h1>
          <p className="text-muted-foreground">
            Управление банковскими гарантиями по тендерам
          </p>
        </div>
        <Button asChild>
          <Link href="/investors/guarantees/new">
            <Plus className="mr-2 h-4 w-4" />
            Новая гарантия
          </Link>
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего гарантий</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              На сумму {formatMoney(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Действующих</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Активных гарантий
            </p>
          </CardContent>
        </Card>

        <Card className={stats.expiringSoon > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Истекают скоро</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.expiringSoon > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.expiringSoon > 0 ? "text-orange-600" : ""}`}>
              {stats.expiringSoon}
            </div>
            <p className="text-xs text-muted-foreground">
              В ближайшие 30 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Комиссия</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(stats.totalCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              Всего уплачено
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Статистика по типам */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">По типам гарантий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(stats.byType).map(([type, typeData]) => {
              const data = typeData as { count: number; amount: number };
              return (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">{GUARANTEE_TYPE_LABELS[type as GuaranteeType]}</p>
                    <p className="text-xs text-muted-foreground">{data.count} шт.</p>
                  </div>
                  <p className="text-sm font-bold">{formatMoney(data.amount)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по номеру, банку, тендеру..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Тип гарантии" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="application">Обеспечение заявки</SelectItem>
                <SelectItem value="contract">Обеспечение контракта</SelectItem>
                <SelectItem value="warranty">Гарантийные обязательства</SelectItem>
                <SelectItem value="advance">Обеспечение аванса</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Действующие</SelectItem>
                <SelectItem value="pending">Ожидают выпуска</SelectItem>
                <SelectItem value="expired">Истекшие</SelectItem>
                <SelectItem value="returned">Возвращённые</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список гарантий ({filteredGuarantees.length})</CardTitle>
          <CardDescription>Все банковские гарантии компании</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGuarantees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Гарантии не найдены</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/investors/guarantees/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить гарантию
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Банк/Источник</TableHead>
                  <TableHead>Тендер</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">Комиссия</TableHead>
                  <TableHead>Действует до</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuarantees.map((g) => {
                  const daysLeft = getDaysUntilExpiry(g.end_date);
                  const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
                  const isExpired = daysLeft <= 0 && g.status === "active";

                  return (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Link
                          href={`/investors/guarantees/${g.id}`}
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          {g.guarantee_number || "Без номера"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {GUARANTEE_TYPE_LABELS[g.guarantee_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {g.bank_name || g.source?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {g.tender ? (
                          <Link
                            href={`/tenders/${g.tender.id}`}
                            className="text-sm hover:text-blue-600 truncate max-w-[200px] block"
                          >
                            {g.tender.purchase_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(g.guarantee_amount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatMoney(g.commission_amount)}
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${isExpired ? "text-red-600" : isExpiringSoon ? "text-orange-600" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          {new Date(g.end_date).toLocaleDateString("ru-RU")}
                          {isExpiringSoon && (
                            <span className="text-xs">({daysLeft} дн.)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[g.status]}>
                          {GUARANTEE_STATUS_LABELS[g.status as GuaranteeStatus]}
                        </Badge>
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
