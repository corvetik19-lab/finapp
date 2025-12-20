"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { TenderProfitabilityData } from "@/lib/accounting/dashboard/types";
import { formatMoney } from "@/lib/accounting/types";
import Link from "next/link";

interface TenderProfitabilityWidgetProps {
  data: TenderProfitabilityData;
}

export function TenderProfitabilityWidget({ data }: TenderProfitabilityWidgetProps) {
  const getMarginColor = (margin: number) => {
    if (margin >= 20) return "text-green-600 bg-green-50";
    if (margin >= 10) return "text-yellow-600 bg-yellow-50";
    if (margin >= 0) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-purple-600" />
            Рентабельность тендеров
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {data.activeTendersCount} активных
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Контракты</div>
              <div className="text-lg font-bold text-blue-600">
                {formatMoney(data.totalContractValue)}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Расходы</div>
              <div className="text-lg font-bold text-red-600">
                {formatMoney(data.totalExpenses)}
              </div>
            </div>
            <div className={`p-3 rounded-lg text-center ${data.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-xs text-muted-foreground">Прибыль</div>
              <div className={`text-lg font-bold ${data.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(data.totalProfit)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Средняя маржинальность</span>
            <span className={`font-bold ${data.averageMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.averageMargin.toFixed(1)}%
            </span>
          </div>

          {data.tenders.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">По тендерам</div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.tenders.slice(0, 5).map((tender) => (
                  <Link
                    key={tender.tenderId}
                    href={`/tenders/${tender.tenderId}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-sm">
                          {tender.purchaseNumber}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tender.customer}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getMarginColor(tender.margin)}`}>
                        {tender.margin >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {tender.margin.toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-muted-foreground">
                        {formatMoney(tender.contractValue)}
                      </span>
                      <span className={tender.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {tender.profit >= 0 ? '+' : ''}{formatMoney(tender.profit)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/tenders/accounting/pnl"
            className="block text-center text-sm text-purple-600 hover:text-purple-700 py-2"
          >
            Полный отчёт P&L →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
