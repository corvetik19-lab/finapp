"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  FileText,
  Link2
} from "lucide-react";
import { formatMoney } from "@/lib/accounting/types";
import {
  BankAccount,
  BankTransaction,
  PROCESSING_STATUSES,
  ProcessingStatus,
  formatAccountNumber,
} from "@/lib/accounting/bank-types";

interface BankTransactionsPageProps {
  account: BankAccount;
  transactions: BankTransaction[];
}

export function BankTransactionsPage({ account, transactions }: BankTransactionsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [operationType, setOperationType] = useState(searchParams.get('type') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Фильтрация транзакций по поиску
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.counterparty_name?.toLowerCase().includes(query) ||
      tx.purpose?.toLowerCase().includes(query) ||
      tx.counterparty_inn?.includes(query)
    );
  });

  // Расчёт итогов
  const totals = filteredTransactions.reduce(
    (acc, tx) => {
      if (tx.operation_type === 'credit') {
        acc.income += tx.amount;
      } else {
        acc.expense += tx.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (operationType && operationType !== 'all') params.set('type', operationType);
    
    router.push(`/tenders/accounting/bank-accounts/${account.id}/transactions?${params.toString()}`);
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setOperationType('all');
    setSearchQuery('');
    router.push(`/tenders/accounting/bank-accounts/${account.id}/transactions`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting/bank-accounts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Выписка по счёту</h1>
            <p className="text-muted-foreground">
              {account.name} • {formatAccountNumber(account.account_number)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Информация о счёте */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Текущий баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(account.balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Поступления
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{formatMoney(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Списания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatMoney(totals.expense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Операций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTransactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                placeholder="От"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                placeholder="До"
              />
            </div>

            <Select value={operationType} onValueChange={setOperationType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Тип операции" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все операции</SelectItem>
                <SelectItem value="credit">Поступления</SelectItem>
                <SelectItem value="debit">Списания</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по контрагенту, назначению..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button onClick={handleFilter}>
              Применить
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список транзакций */}
      <Card>
        <CardHeader>
          <CardTitle>Операции</CardTitle>
          <CardDescription>
            {filteredTransactions.length} операций за выбранный период
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Нет операций</h3>
              <p className="text-muted-foreground">
                За выбранный период операций не найдено
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Дата</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead>Назначение</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => {
                  const statusInfo = PROCESSING_STATUSES[tx.processing_status as ProcessingStatus];
                  const isIncome = tx.operation_type === 'credit';
                  
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(tx.transaction_date).toLocaleDateString('ru-RU')}
                        </div>
                        {tx.transaction_time && (
                          <div className="text-xs text-muted-foreground">
                            {tx.transaction_time}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isIncome ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {tx.counterparty_name || 'Не указан'}
                            </div>
                            {tx.counterparty_inn && (
                              <div className="text-xs text-muted-foreground">
                                ИНН: {tx.counterparty_inn}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate" title={tx.purpose || ''}>
                          {tx.purpose || '—'}
                        </div>
                        {tx.accounting_document_id && (
                          <div className="flex items-center gap-1 text-xs text-primary mt-1">
                            <Link2 className="h-3 w-3" />
                            Связан с документом
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
                        </div>
                        {tx.fee > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Комиссия: {formatMoney(tx.fee)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${statusInfo?.color}20`,
                            color: statusInfo?.color 
                          }}
                        >
                          {statusInfo?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <FileText className="h-4 w-4" />
                        </Button>
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
