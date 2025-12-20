"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, Clock } from "lucide-react";
import { ReceivablesData } from "@/lib/accounting/dashboard/types";
import { formatMoney } from "@/lib/accounting/types";
import Link from "next/link";

interface ReceivablesWidgetProps {
  data: ReceivablesData;
}

export function ReceivablesWidget({ data }: ReceivablesWidgetProps) {
  const getAgeColor = (index: number) => {
    const colors = ["bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
    return colors[index] || "bg-gray-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Дебиторская задолженность
          </div>
          {data.overdueCount > 0 && (
            <span className="flex items-center gap-1 text-sm font-normal text-red-600">
              <AlertTriangle className="h-4 w-4" />
              {data.overdueCount} просрочено
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-muted-foreground">Всего</div>
              <div className="text-xl font-bold text-blue-600">
                {formatMoney(data.totalAmount)}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-sm text-muted-foreground">Просрочено</div>
              <div className="text-xl font-bold text-red-600">
                {formatMoney(data.overdueAmount)}
              </div>
            </div>
          </div>

          {data.byAge.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">По срокам</div>
              <div className="flex h-3 rounded-full overflow-hidden">
                {data.byAge.map((bucket, i) => (
                  bucket.percent > 0 && (
                    <div
                      key={bucket.label}
                      className={`${getAgeColor(i)} transition-all`}
                      style={{ width: `${bucket.percent}%` }}
                      title={`${bucket.label}: ${formatMoney(bucket.amount)}`}
                    />
                  )
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.byAge.map((bucket, i) => (
                  bucket.count > 0 && (
                    <div key={bucket.label} className="flex items-center gap-1 text-xs">
                      <div className={`w-2 h-2 rounded-full ${getAgeColor(i)}`} />
                      <span className="text-muted-foreground">{bucket.label}</span>
                      <span className="font-medium">{bucket.count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {data.topDebtors.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Топ должников</div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.topDebtors.slice(0, 5).map((debtor) => (
                  <div
                    key={debtor.counterpartyId || debtor.counterpartyName}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{debtor.counterpartyName}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{debtor.invoicesCount} счёт(ов)</span>
                        {debtor.overdueDays > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <Clock className="h-3 w-3" />
                            {debtor.overdueDays} дн.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(debtor.amount)}</div>
                      {debtor.overdueAmount > 0 && (
                        <div className="text-xs text-red-500">
                          {formatMoney(debtor.overdueAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/tenders/accounting/counterparties?filter=debtors"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
          >
            Все должники →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
