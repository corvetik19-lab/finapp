"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  Link2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  syncSupplierWithCounterparty,
  getSupplierAccountingDocuments,
  getSupplierPurchaseStats,
} from "@/lib/suppliers/service";

interface SupplierAccountingProps {
  supplierId: string;
  counterpartyId?: string | null;
}

interface AccountingDocument {
  id: string;
  document_number: string;
  document_date: string;
  document_type: string;
  total_amount: number;
  status: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice_in: "Входящий счёт",
  invoice_out: "Исходящий счёт",
  act_in: "Входящий акт",
  act_out: "Исходящий акт",
  waybill_in: "Входящая накладная",
  waybill_out: "Исходящая накладная",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Черновик", variant: "secondary" },
  pending: { label: "Ожидает", variant: "outline" },
  signed: { label: "Подписан", variant: "default" },
  cancelled: { label: "Отменён", variant: "destructive" },
};

export function SupplierAccounting({ supplierId, counterpartyId }: SupplierAccountingProps) {
  const [isLinked, setIsLinked] = useState(!!counterpartyId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<AccountingDocument[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [stats, setStats] = useState({
    totalAmount: 0,
    documentCount: 0,
    avgAmount: 0,
    lastPurchaseDate: null as string | null,
  });

  useEffect(() => {
    if (isLinked) {
      loadData();
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, isLinked]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docsResult, statsResult] = await Promise.all([
        getSupplierAccountingDocuments(supplierId),
        getSupplierPurchaseStats(supplierId),
      ]);

      setDocuments(docsResult.documents as AccountingDocument[]);
      setTotals(docsResult.totals);
      setStats(statsResult);
    } catch (error) {
      console.error("Error loading accounting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncSupplierWithCounterparty(supplierId);
      if (result.success) {
        setIsLinked(true);
        await loadData();
      }
    } catch (error) {
      console.error("Error syncing with counterparty:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLinked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Поставщик не связан с бухгалтерией</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Для отображения документов и статистики закупок необходимо связать поставщика
            с контрагентом в модуле бухгалтерии.
          </p>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Синхронизация...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Связать с бухгалтерией
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего закупок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.documentCount} документов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Средний чек
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.avgAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Расходы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totals.expense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Доходы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(totals.income)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Документы */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Документы
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Обновить
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/tenders/accounting/documents" target="_blank">
                <ExternalLink className="h-4 w-4 mr-1" />
                Все документы
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Документов пока нет</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {doc.document_number}
                    </TableCell>
                    <TableCell>{formatDate(doc.document_date)}</TableCell>
                    <TableCell>
                      {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </TableCell>
                    <TableCell>{formatMoney(doc.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LABELS[doc.status]?.variant || "secondary"}>
                        {STATUS_LABELS[doc.status]?.label || doc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Последняя закупка */}
      {stats.lastPurchaseDate && (
        <div className="text-sm text-muted-foreground text-center">
          Последняя закупка: {formatDate(stats.lastPurchaseDate)}
        </div>
      )}
    </div>
  );
}
