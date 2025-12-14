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
  ArrowRight
} from "lucide-react";
import { AccountingSettings, TaxPayment, formatMoney, TAX_SYSTEMS, ORGANIZATION_TYPES } from "@/lib/accounting/types";

interface AccountingDashboardProps {
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
}

export function AccountingDashboard({ settings, stats, upcomingTaxes }: AccountingDashboardProps) {
  const currentYear = new Date().getFullYear();
  
  // Если настройки не заполнены, показываем приглашение настроить
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
              Для начала работы с бухгалтерией необходимо настроить реквизиты организации и выбрать систему налогообложения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Форма организации</h4>
                  <p className="text-sm text-muted-foreground">ИП, ООО или АО</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Система налогообложения</h4>
                  <p className="text-sm text-muted-foreground">УСН, ОСНО, ПСН</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Реквизиты</h4>
                  <p className="text-sm text-muted-foreground">ИНН, КПП, ОГРН</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Банковские реквизиты</h4>
                  <p className="text-sm text-muted-foreground">Расчётный счёт, БИК</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/tenders/accounting/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Настроить организацию
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const taxSystemInfo = TAX_SYSTEMS[settings.tax_system];
  const orgTypeInfo = ORGANIZATION_TYPES[settings.organization_type];

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

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доходы {currentYear}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">По КУДиР</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Расходы {currentYear}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(stats.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">По КУДиР</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(stats.profit)}
            </div>
            <p className="text-xs text-muted-foreground">Доходы − Расходы</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Документов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsCount}</div>
            <p className="text-xs text-muted-foreground">За {currentYear} год</p>
          </CardContent>
        </Card>
      </div>

      {/* Предупреждения */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.unpaidInvoices > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-4 w-4" />
                Неоплаченные счета
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {stats.unpaidInvoices} шт.
              </div>
              <p className="text-sm text-orange-600">
                На сумму {formatMoney(stats.unpaidInvoicesAmount)}
              </p>
              <Button variant="link" className="p-0 h-auto text-orange-700" asChild>
                <Link href="/tenders/accounting/documents?status=issued">
                  Посмотреть <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {stats.upcomingTaxes > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                <Calendar className="h-4 w-4" />
                Предстоящие налоги
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {stats.upcomingTaxes} платежей
              </div>
              <p className="text-sm text-blue-600">
                На сумму {formatMoney(stats.upcomingTaxesAmount)}
              </p>
              <Button variant="link" className="p-0 h-auto text-blue-700" asChild>
                <Link href="/tenders/accounting/taxes/calendar">
                  К календарю <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Быстрый доступ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/tenders/accounting/documents" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
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
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
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
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
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
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
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

      {/* Предстоящие налоговые платежи */}
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
                      isUrgent ? 'border-red-200 bg-red-50' : 'border-muted'
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
            {upcomingTaxes.length > 5 && (
              <Button variant="link" className="mt-4 w-full" asChild>
                <Link href="/tenders/accounting/taxes/calendar">
                  Показать все ({upcomingTaxes.length})
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Информация об организации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Информация об организации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Форма</p>
              <p className="font-medium">{orgTypeInfo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ИНН</p>
              <p className="font-medium">{settings.inn || '—'}</p>
            </div>
            {settings.kpp && (
              <div>
                <p className="text-sm text-muted-foreground">КПП</p>
                <p className="font-medium">{settings.kpp}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Налогообложение</p>
              <p className="font-medium">
                {taxSystemInfo?.name}
                {taxSystemInfo?.rate && ` (${taxSystemInfo.rate}%)`}
              </p>
            </div>
            {settings.vat_payer && (
              <div>
                <p className="text-sm text-muted-foreground">НДС</p>
                <p className="font-medium">{settings.vat_rate}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
