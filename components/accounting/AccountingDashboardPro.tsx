"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Landmark, 
  FileText, 
  BookOpen, 
  Calculator, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  ArrowRight,
  Wallet,
  Receipt,
  Building2
} from "lucide-react";
import { AccountingSettings, AccountingDocument, TaxPayment, formatMoney, TAX_SYSTEMS, DOCUMENT_TYPES, DOCUMENT_STATUSES } from "@/lib/accounting/types";
import { MonthlyStats, DebtorCreditor, TopCounterparty } from "@/lib/accounting/service";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AccountingDashboardProProps {
  settings: AccountingSettings | null;
  stats: {
    totalIncome: number;
    totalExpense: number;
    profit: number;
    unpaidInvoices: number;
    unpaidInvoicesAmount: number;
    upcomingTaxes: number;
    upcomingTaxesAmount: number;
    documentsCount: number;
  };
  upcomingTaxes: TaxPayment[];
  extendedStats: {
    monthlyStats: MonthlyStats[];
    debtors: DebtorCreditor[];
    creditors: DebtorCreditor[];
    topCounterparties: TopCounterparty[];
    totalDebt: number;
    totalCredit: number;
  };
  recentDocuments: AccountingDocument[];
}

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

export function AccountingDashboardPro({ 
  settings, 
  stats, 
  upcomingTaxes,
  extendedStats,
  recentDocuments 
}: AccountingDashboardProProps) {
  const currentYear = new Date().getFullYear();
  
  // Если настройки не заполнены
  if (!settings) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary" />
            Бухгалтерия
          </h1>
          <p className="text-muted-foreground">Бухгалтерский учёт и документооборот</p>
        </div>
        
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Настройте организацию
            </CardTitle>
            <CardDescription>
              Для начала работы с бухгалтерией необходимо настроить реквизиты организации
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/tenders/accounting/settings">
                <Settings className="h-4 w-4 mr-2" />
                Настроить организацию
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const taxSystemInfo = TAX_SYSTEMS[settings.tax_system];

  // Данные для графика доходов/расходов по месяцам
  const monthlyChartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        label: "Доходы",
        data: extendedStats.monthlyStats.map(m => m.income / 100),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderRadius: 4,
      },
      {
        label: "Расходы",
        data: extendedStats.monthlyStats.map(m => m.expense / 100),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderRadius: 4,
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => `${Number(value).toLocaleString()} ₽`,
        },
      },
    },
  };

  // Данные для круговой диаграммы задолженностей
  const debtChartData = {
    labels: ["Дебиторская", "Кредиторская"],
    datasets: [
      {
        data: [extendedStats.totalDebt / 100, extendedStats.totalCredit / 100],
        backgroundColor: ["rgba(59, 130, 246, 0.7)", "rgba(249, 115, 22, 0.7)"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary" />
            Бухгалтерия
          </h1>
          <p className="text-muted-foreground">
            {settings.short_name || settings.full_name} • {taxSystemInfo?.name}
            {settings.vat_payer && " • Плательщик НДС"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/tenders/accounting/settings">
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tenders/accounting/documents/new">
              <Plus className="h-4 w-4 mr-2" />
              Новый документ
            </Link>
          </Button>
        </div>
      </div>

      {/* Основные показатели */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Доходы {currentYear}</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatMoney(stats.totalIncome)}
            </div>
            <p className="text-xs text-green-600">По КУДиР</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Расходы {currentYear}</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatMoney(stats.totalExpense)}
            </div>
            <p className="text-xs text-red-600">По КУДиР</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Прибыль</CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatMoney(stats.profit)}
            </div>
            <p className="text-xs text-blue-600">Доходы − Расходы</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Документов</CardTitle>
            <FileText className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.documentsCount}</div>
            <p className="text-xs text-purple-600">За {currentYear} год</p>
          </CardContent>
        </Card>
      </div>

      {/* Графики и задолженности */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* График доходов/расходов */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Доходы и расходы по месяцам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={monthlyChartData} options={monthlyChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Задолженности */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Задолженности
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(extendedStats.totalDebt > 0 || extendedStats.totalCredit > 0) ? (
              <>
                <div className="h-[150px]">
                  <Doughnut 
                    data={debtChartData} 
                    options={{ 
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } }
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm text-blue-700">Дебиторская</span>
                    <span className="font-bold text-blue-700">{formatMoney(extendedStats.totalDebt)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="text-sm text-orange-700">Кредиторская</span>
                    <span className="font-bold text-orange-700">{formatMoney(extendedStats.totalCredit)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Wallet className="h-12 w-12 mb-2 opacity-50" />
                <p>Нет задолженностей</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Предупреждения и последние документы */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Предупреждения */}
        <div className="space-y-4">
          {stats.unpaidInvoices > 0 && (
            <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                  <AlertCircle className="h-5 w-5" />
                  Неоплаченные счета
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-700">
                      {stats.unpaidInvoices} шт.
                    </div>
                    <p className="text-sm text-orange-600">
                      На сумму {formatMoney(stats.unpaidInvoicesAmount)}
                    </p>
                  </div>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100" asChild>
                    <Link href="/tenders/accounting/documents?status=issued">
                      Посмотреть <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.upcomingTaxes > 0 && (
            <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                  <Calendar className="h-5 w-5" />
                  Предстоящие налоги
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {stats.upcomingTaxes} платежей
                    </div>
                    <p className="text-sm text-blue-600">
                      На сумму {formatMoney(stats.upcomingTaxesAmount)}
                    </p>
                  </div>
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100" asChild>
                    <Link href="/tenders/accounting/taxes/calendar">
                      К календарю <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Топ контрагентов */}
          {extendedStats.topCounterparties.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Топ контрагентов по обороту
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {extendedStats.topCounterparties.slice(0, 5).map((cp, idx) => (
                    <div key={cp.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="text-sm font-medium truncate max-w-[150px]">{cp.name}</span>
                      </div>
                      <span className="font-bold text-sm">{formatMoney(cp.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Последние документы */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Последние документы
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tenders/accounting/documents">
                  Все документы <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.map((doc) => {
                  const docType = DOCUMENT_TYPES[doc.document_type];
                  const status = DOCUMENT_STATUSES[doc.status];
                  return (
                    <Link
                      key={doc.id}
                      href={`/tenders/accounting/documents/${doc.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {docType?.name} №{doc.document_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.document_date).toLocaleDateString("ru-RU")}
                            {doc.counterparty && ` • ${(doc.counterparty as { short_name?: string })?.short_name || ""}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatMoney(doc.total)}</p>
                        <Badge 
                          variant={status?.color === "green" ? "default" : status?.color === "red" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {status?.name}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <p>Нет документов</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/tenders/accounting/documents/new">
                    Создать первый документ
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Быстрый доступ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/tenders/accounting/documents" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Документы
              </CardTitle>
              <CardDescription>
                Счета, акты, накладные, УПД
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/tenders/accounting/kudir" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                КУДиР
              </CardTitle>
              <CardDescription>
                Книга учёта доходов и расходов
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/tenders/accounting/taxes" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Налоги
              </CardTitle>
              <CardDescription>
                Расчёт и календарь платежей
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/tenders/accounting/counterparties" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Контрагенты
              </CardTitle>
              <CardDescription>
                Заказчики и поставщики
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Ближайшие налоги */}
      {upcomingTaxes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ближайшие налоговые платежи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTaxes.slice(0, 5).map((tax) => {
                const dueDate = new Date(tax.due_date);
                const today = new Date();
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysUntil <= 7;
                const remaining = tax.calculated_amount - tax.paid_amount;
                
                return (
                  <div 
                    key={tax.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isUrgent ? 'border-red-300 bg-red-50' : 'border-muted'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{tax.tax_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Срок: {dueDate.toLocaleDateString('ru-RU')}
                        {isUrgent && (
                          <Badge variant="destructive" className="ml-2">
                            {daysUntil <= 0 ? 'Просрочено' : `${daysUntil} дн.`}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatMoney(remaining)}</p>
                      {tax.paid_amount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Оплачено: {formatMoney(tax.paid_amount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
