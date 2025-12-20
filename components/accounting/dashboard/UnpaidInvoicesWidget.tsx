"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileText, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface UnpaidInvoice {
  id: string;
  document_number: string;
  counterparty_name: string;
  amount: number;
  issue_date: string;
  due_date: string;
  days_until_due: number;
  type: "incoming" | "outgoing";
}

interface UnpaidInvoicesWidgetProps {
  invoices: UnpaidInvoice[];
  incomingTotal: number;
  outgoingTotal: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function UnpaidInvoicesWidget({
  invoices,
  incomingTotal,
  outgoingTotal,
}: UnpaidInvoicesWidgetProps) {
  const urgentCount = invoices.filter((i) => i.days_until_due <= 3 && i.days_until_due >= 0).length;
  const overdueCount = invoices.filter((i) => i.days_until_due < 0).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Неоплаченные счета
          </CardTitle>
          <Link href="/tenders/accounting/documents?status=unpaid">
            <Button variant="ghost" size="sm">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground">К получению</div>
            <div className="text-xl font-bold text-emerald-600">
              {formatMoney(incomingTotal)} ₽
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">К оплате</div>
            <div className="text-xl font-bold text-orange-600">
              {formatMoney(outgoingTotal)} ₽
            </div>
          </div>
        </div>

        {(urgentCount > 0 || overdueCount > 0) && (
          <div className="flex gap-2 mb-3">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {overdueCount} просрочено
              </Badge>
            )}
            {urgentCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                <Clock className="h-3 w-3" />
                {urgentCount} срочных
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-2">
          {invoices.slice(0, 5).map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      invoice.type === "incoming"
                        ? "text-emerald-600 border-emerald-200"
                        : "text-orange-600 border-orange-200"
                    }
                  >
                    {invoice.type === "incoming" ? "Вход" : "Исход"}
                  </Badge>
                  <span className="font-medium text-sm">№{invoice.document_number}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {invoice.counterparty_name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-medium">
                  {formatMoney(invoice.amount)} ₽
                </div>
                <div className="text-xs text-muted-foreground">
                  {invoice.days_until_due < 0 ? (
                    <span className="text-red-500">просрочен</span>
                  ) : invoice.days_until_due === 0 ? (
                    <span className="text-amber-500">сегодня</span>
                  ) : (
                    <span>до {formatDate(invoice.due_date)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Все счета оплачены
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
