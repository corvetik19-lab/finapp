"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, RefreshCw, ArrowDown, ArrowUp } from "lucide-react";
import { BankTransaction, BankIntegration } from "@/lib/accounting/bank-types";
import { getBankTransactions } from "@/lib/accounting/bank-service";

interface BankStatementsPageProps {
  initialStatements: BankTransaction[];
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

export function BankStatementsPage({
  initialStatements,
  connections,
  initialStartDate,
  initialEndDate,
}: BankStatementsPageProps) {
  const [statements, setStatements] = useState(initialStatements);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [connectionFilter, setConnectionFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newStatements = await getBankTransactions({
        dateFrom: startDate,
        dateTo: endDate,
      });
      setStatements(newStatements);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCredit = statements
    .filter((s) => s.operation_type === "credit")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalDebit = statements
    .filter((s) => s.operation_type === "debit")
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Банковские выписки</h1>
          <p className="text-muted-foreground">
            Операции по банковским счетам
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Период:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
            />
            <Select value={connectionFilter} onValueChange={setConnectionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все подключения" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все подключения</SelectItem>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Операций</div>
            <div className="text-2xl font-bold">{statements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDown className="h-4 w-4 text-emerald-500" />
              Поступления
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(totalCredit)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUp className="h-4 w-4 text-red-500" />
              Списания
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totalDebit)} ₽
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Операции
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Назначение</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((stmt) => (
                <TableRow key={stmt.id}>
                  <TableCell>
                    {stmt.operation_type === "credit" ? (
                      <ArrowDown className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(stmt.transaction_date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{stmt.counterparty_name || "—"}</div>
                    <div className="text-sm text-muted-foreground">
                      {stmt.counterparty_inn || ""}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {stmt.purpose || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={stmt.operation_type === "credit" ? "text-emerald-600" : "text-red-600"}>
                      {stmt.operation_type === "credit" ? "+" : "−"}
                      {formatMoney(stmt.amount)} ₽
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={stmt.processing_status === "processed" ? "default" : "secondary"}>
                      {stmt.processing_status === "processed" ? "Обработана" : 
                       stmt.processing_status === "new" ? "Новая" : stmt.processing_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {statements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Операции не найдены</p>
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
