"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, AlertTriangle, Clock, Building2 } from "lucide-react";
import Link from "next/link";

interface Payable {
  id: string;
  counterparty_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  document_number?: string;
}

interface PayablesWidgetProps {
  payables: Payable[];
  totalAmount: number;
  overdueAmount: number;
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

export function PayablesWidget({ payables, totalAmount, overdueAmount }: PayablesWidgetProps) {
  const overdueCount = payables.filter((p) => p.days_overdue > 0).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-500" />
            Кредиторская задолженность
          </CardTitle>
          <Link href="/tenders/accounting/counterparties?tab=payables">
            <Button variant="ghost" size="sm">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Всего должны</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatMoney(totalAmount)} ₽
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Просрочено
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(overdueAmount)} ₽
            </div>
          </div>
        </div>

        {overdueCount > 0 && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700 font-medium">
              {overdueCount} платежей просрочено
            </div>
          </div>
        )}

        <div className="space-y-2">
          {payables.slice(0, 5).map((payable) => (
            <div
              key={payable.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {payable.counterparty_name}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  до {formatDate(payable.due_date)}
                  {payable.days_overdue > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      +{payable.days_overdue} дн.
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-medium text-orange-600">
                  {formatMoney(payable.amount)} ₽
                </div>
              </div>
            </div>
          ))}
          {payables.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Нет задолженности
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
