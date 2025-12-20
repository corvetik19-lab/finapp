"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ArrowRightLeft, Search, RefreshCw, MoreVertical, ArrowDown, ArrowUp, CheckCircle } from "lucide-react";
import { BankTransaction, BankIntegration, PROCESSING_STATUSES } from "@/lib/accounting/bank-types";
import { getBankTransactions } from "@/lib/accounting/bank-service";

interface BankTransactionsPageProps {
  initialTransactions: BankTransaction[];
  connections: BankIntegration[];
  initialStartDate: string;
  initialEndDate: string;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

export function BankTransactionsPage({
  initialTransactions,
  connections: _connections,
  initialStartDate,
  initialEndDate,
}: BankTransactionsPageProps) {
  void _connections;
  const [transactions, setTransactions] = useState(initialTransactions);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newTransactions = await getBankTransactions({
        dateFrom: startDate,
        dateTo: endDate,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setTransactions(newTransactions);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.counterparty_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (t.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || t.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const newCount = transactions.filter((t) => t.processing_status === "new").length;
  const processedCount = transactions.filter((t) => t.processing_status === "processed").length;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Банковские транзакции</h1>
          <p className="text-muted-foreground">
            Обработка и категоризация операций
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <Button variant="outline">
              Категоризировать ({selectedIds.size})
            </Button>
            <Button>
              <CheckCircle className="h-4 w-4 mr-2" />
              Обработать ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Период:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(PROCESSING_STATUSES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по контрагенту или назначению..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowRightLeft className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего</div>
                <div className="text-2xl font-bold">{transactions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={newCount > 0 ? "border-blue-200 bg-blue-50" : ""}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Новых</div>
            <div className={`text-2xl font-bold ${newCount > 0 ? "text-blue-600" : ""}`}>
              {newCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Обработано</div>
            <div className="text-2xl font-bold text-emerald-600">{processedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Пропущено</div>
            <div className="text-2xl font-bold text-muted-foreground">
              {transactions.filter((t) => t.processing_status === "ignored").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Транзакции ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Назначение</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => (
                <TableRow key={tx.id} className={selectedIds.has(tx.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(tx.id)}
                      onCheckedChange={() => toggleSelect(tx.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {tx.operation_type === "credit" ? (
                      <ArrowDown className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[200px] truncate">
                      {tx.counterparty_name || "—"}
                    </div>
                    {tx.counterparty_inn && (
                      <div className="text-sm text-muted-foreground">
                        ИНН: {tx.counterparty_inn}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <span className="line-clamp-2 text-sm">
                      {tx.purpose || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={tx.operation_type === "credit" ? "text-emerald-600" : "text-red-600"}>
                      {tx.operation_type === "credit" ? "+" : "−"}
                      {formatMoney(tx.amount)} ₽
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: PROCESSING_STATUSES[tx.processing_status]?.color + "20",
                        color: PROCESSING_STATUSES[tx.processing_status]?.color,
                      }}
                    >
                      {PROCESSING_STATUSES[tx.processing_status]?.name || tx.processing_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Обработать</DropdownMenuItem>
                        <DropdownMenuItem>Категоризировать</DropdownMenuItem>
                        <DropdownMenuItem>Пропустить</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Транзакции не найдены</p>
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
