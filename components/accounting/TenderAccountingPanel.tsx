"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, RefreshCw, ExternalLink, Receipt, BookOpen } from "lucide-react";

interface TenderAccountingPanelProps {
  tenderId: string;
  contractPrice: number | null;
  currency?: string;
}

interface TenderDocument {
  id: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
}

interface FinancialSummary {
  documentsCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalExpenses: number;
  profit: number;
  kudirEntriesCount: number;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice: "Счёт",
  contract: "Договор",
  act: "Акт",
  invoice_upd: "УПД",
  waybill: "Накладная",
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Ожидает", variant: "secondary" },
  partial: { label: "Частично", variant: "outline" },
  paid: { label: "Оплачено", variant: "default" },
  overdue: { label: "Просрочено", variant: "destructive" },
};

function formatMoney(kopecks: number, currency: string = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(kopecks / 100);
}

export function TenderAccountingPanel({
  tenderId,
  contractPrice,
  currency = "RUB",
}: TenderAccountingPanelProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<TenderDocument[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("invoice");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  async function loadData() {
    setLoading(true);
    try {
      const [docsRes, summaryRes] = await Promise.all([
        fetch(`/api/accounting/tender/${tenderId}/documents`),
        fetch(`/api/accounting/tender/${tenderId}/summary`),
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Error loading tender accounting data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument() {
    setCreating(true);
    try {
      const res = await fetch(`/api/accounting/tender/${tenderId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: selectedDocType }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.documentId) {
          router.push(`/tenders/accounting/documents/${data.documentId}`);
        }
        await loadData();
      }
    } catch (error) {
      console.error("Error creating document:", error);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateKudirEntry(entryType: "income" | "expense") {
    if (!contractPrice) return;

    try {
      const res = await fetch(`/api/accounting/tender/${tenderId}/kudir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          amount: contractPrice,
        }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error creating KUDIR entry:", error);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Бухгалтерия
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Финансовая сводка */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">Выставлено</div>
              <div className="font-medium">{formatMoney(summary.totalInvoiced, currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Оплачено</div>
              <div className="font-medium text-green-600">{formatMoney(summary.totalPaid, currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Расходы</div>
              <div className="font-medium text-red-600">{formatMoney(summary.totalExpenses, currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Прибыль</div>
              <div className={`font-medium ${summary.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatMoney(summary.profit, currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Документов</div>
              <div className="font-medium">{summary.documentsCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Записей КУДиР</div>
              <div className="font-medium">{summary.kudirEntriesCount}</div>
            </div>
          </div>
        )}

        {/* Создание документа */}
        <div className="flex gap-2">
          <Select value={selectedDocType} onValueChange={setSelectedDocType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Счёт</SelectItem>
              <SelectItem value="contract">Договор</SelectItem>
              <SelectItem value="act">Акт</SelectItem>
              <SelectItem value="invoice_upd">УПД</SelectItem>
              <SelectItem value="waybill">Накладная</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleCreateDocument}
            disabled={creating}
          >
            <Plus className="h-4 w-4 mr-1" />
            Создать
          </Button>
        </div>

        {/* Быстрые действия КУДиР */}
        {contractPrice && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateKudirEntry("income")}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              + Доход в КУДиР
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateKudirEntry("expense")}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              + Расход в КУДиР
            </Button>
          </div>
        )}

        {/* Список документов */}
        {documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const paymentStatus = PAYMENT_STATUS_LABELS[doc.paymentStatus] || PAYMENT_STATUS_LABELS.pending;
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{doc.documentNumber}</TableCell>
                    <TableCell>{new Date(doc.documentDate).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell className="text-right">{formatMoney(doc.totalAmount, currency)}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/tenders/accounting/documents/${doc.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Документов пока нет</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
