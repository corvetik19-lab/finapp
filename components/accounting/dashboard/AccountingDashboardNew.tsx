"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Download, Settings } from "lucide-react";
import Link from "next/link";

import { FinancialOverviewWidget } from "./FinancialOverviewWidget";
import { ReceivablesWidget } from "./ReceivablesWidget";
import { TenderProfitabilityWidget } from "./TenderProfitabilityWidget";
import { TaxCalendarWidget } from "./TaxCalendarWidget";
import { QuickActionsWidget } from "./QuickActionsWidget";

import {
  DashboardPeriod,
  FinancialOverviewData,
  ReceivablesData,
  PayablesData,
  TenderProfitabilityData,
  TaxCalendarData,
  UnpaidInvoicesData,
} from "@/lib/accounting/dashboard/types";
import { formatMoney } from "@/lib/accounting/types";
import { AccountingSettings } from "@/lib/accounting/types";

interface AccountingDashboardNewProps {
  settings: AccountingSettings | null;
  financialOverview: FinancialOverviewData;
  receivables: ReceivablesData;
  payables: PayablesData;
  tenderProfitability: TenderProfitabilityData;
  taxCalendar: TaxCalendarData;
  unpaidInvoices: UnpaidInvoicesData;
}

export function AccountingDashboardNew({
  settings,
  financialOverview,
  receivables,
  payables,
  tenderProfitability,
  taxCalendar,
  unpaidInvoices,
}: AccountingDashboardNewProps) {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Перезагрузка страницы для обновления данных
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Баннер если нет настроек */}
      {!settings && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Настройте данные организации</p>
                  <p className="text-sm text-amber-600">Укажите реквизиты для корректного формирования документов</p>
                </div>
              </div>
              <Link href="/tenders/accounting/settings">
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  <Settings className="h-4 w-4 mr-2" />
                  Настроить
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Бухгалтерия</h1>
          <p className="text-muted-foreground">
            {settings?.short_name || settings?.full_name || "Финансовый обзор"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="quarter">Квартал</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Быстрые действия */}
      <QuickActionsWidget />

      {/* Финансовый обзор */}
      <FinancialOverviewWidget data={financialOverview} />

      {/* Основные виджеты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Дебиторка и кредиторка */}
        <ReceivablesWidget data={receivables} />
        
        {/* Кредиторская задолженность */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Кредиторская задолженность</span>
              {payables.overdueCount > 0 && (
                <span className="text-sm font-normal text-red-600">
                  {payables.overdueCount} просрочено
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Всего</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatMoney(payables.totalAmount)}
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Просрочено</div>
                <div className="text-xl font-bold text-red-600">
                  {formatMoney(payables.overdueAmount)}
                </div>
              </div>
            </div>
            {payables.topCreditors.length > 0 && (
              <div className="mt-4 space-y-2">
                {payables.topCreditors.slice(0, 3).map((creditor) => (
                  <div
                    key={creditor.counterpartyId || creditor.counterpartyName}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="truncate text-sm">{creditor.counterpartyName}</span>
                    <span className="font-medium">{formatMoney(creditor.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Рентабельность тендеров */}
        <TenderProfitabilityWidget data={tenderProfitability} />

        {/* Налоговый календарь */}
        <TaxCalendarWidget data={taxCalendar} />
      </div>

      {/* Неоплаченные счета */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Неоплаченные счета</span>
            <span className="text-sm font-normal text-muted-foreground">
              {unpaidInvoices.totalCount} на {formatMoney(unpaidInvoices.totalAmount)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {unpaidInvoices.byStatus.map((status) => (
              <div key={status.status} className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{status.label}</div>
                <div className="font-bold">{status.count}</div>
                <div className="text-xs text-muted-foreground">{formatMoney(status.amount)}</div>
              </div>
            ))}
            {unpaidInvoices.overdueCount > 0 && (
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <div className="text-xs text-muted-foreground">Просрочено</div>
                <div className="font-bold text-red-600">{unpaidInvoices.overdueCount}</div>
                <div className="text-xs text-red-600">{formatMoney(unpaidInvoices.overdueAmount)}</div>
              </div>
            )}
          </div>

          {unpaidInvoices.invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">№ документа</th>
                    <th className="text-left py-2 font-medium">Дата</th>
                    <th className="text-left py-2 font-medium">Контрагент</th>
                    <th className="text-right py-2 font-medium">Сумма</th>
                    <th className="text-right py-2 font-medium">Остаток</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidInvoices.invoices.slice(0, 5).map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <Link
                          href={`/tenders/accounting/documents/${invoice.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {invoice.documentNumber}
                        </Link>
                      </td>
                      <td className="py-2">
                        {new Date(invoice.documentDate).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="py-2 truncate max-w-[200px]">
                        {invoice.counterpartyName}
                      </td>
                      <td className="py-2 text-right">{formatMoney(invoice.amount)}</td>
                      <td className={`py-2 text-right font-medium ${invoice.overdueDays > 0 ? "text-red-600" : ""}`}>
                        {formatMoney(invoice.remainingAmount)}
                        {invoice.overdueDays > 0 && (
                          <span className="text-xs ml-1">({invoice.overdueDays} дн.)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Link
            href="/tenders/accounting/documents?status=unpaid"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 py-3"
          >
            Все неоплаченные счета →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
