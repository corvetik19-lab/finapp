"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Calculator
} from "lucide-react";
import { 
  KudirEntry,
  AccountingSettings,
  formatMoney,
  getQuarterName,
  getMonthName,
  TAX_SYSTEMS
} from "@/lib/accounting/types";

interface ReportsPageProps {
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
  kudirEntries: KudirEntry[];
  settings: AccountingSettings | null;
  year: number;
}

export function ReportsPage({ stats, kudirEntries, settings, year }: ReportsPageProps) {
  // Данные по месяцам
  const monthlyData = useMemo(() => {
    const months: Record<number, { income: number; expense: number }> = {};
    
    for (let i = 1; i <= 12; i++) {
      months[i] = { income: 0, expense: 0 };
    }
    
    kudirEntries.forEach(entry => {
      const month = new Date(entry.entry_date).getMonth() + 1;
      if (months[month]) {
        months[month].income += entry.income || 0;
        months[month].expense += entry.expense || 0;
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({
      month: parseInt(month),
      monthName: getMonthName(parseInt(month)),
      ...data,
      profit: data.income - data.expense,
    }));
  }, [kudirEntries]);

  // Данные по кварталам
  const quarterlyData = useMemo(() => {
    return [1, 2, 3, 4].map(quarter => {
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 2;
      
      const quarterEntries = kudirEntries.filter(entry => {
        const entryDate = new Date(entry.entry_date);
        const month = entryDate.getMonth();
        return month >= startMonth && month <= endMonth;
      });
      
      const income = quarterEntries.reduce((sum, e) => sum + (e.income || 0), 0);
      const expense = quarterEntries.reduce((sum, e) => sum + (e.expense || 0), 0);
      
      return {
        quarter,
        quarterName: getQuarterName(quarter),
        income,
        expense,
        profit: income - expense,
      };
    });
  }, [kudirEntries]);

  // Максимальные значения для масштабирования графиков
  const maxMonthlyValue = Math.max(
    ...monthlyData.map(m => Math.max(m.income, m.expense)),
    1
  );

  const maxQuarterlyValue = Math.max(
    ...quarterlyData.map(q => Math.max(q.income, q.expense)),
    1
  );

  const taxSystemInfo = settings ? TAX_SYSTEMS[settings.tax_system] : null;

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Отчёты и аналитика
            </h1>
            <p className="text-muted-foreground">
              {year} год • {taxSystemInfo?.name || 'Не настроено'}
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт отчётов
        </Button>
      </div>

      {/* Итоговые показатели */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего доходов</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(stats.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего расходов</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(stats.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <PieChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(stats.profit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Документов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* График по кварталам */}
      <Card>
        <CardHeader>
          <CardTitle>Доходы и расходы по кварталам</CardTitle>
          <CardDescription>Сравнение за {year} год</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            {quarterlyData.map(qd => (
              <div key={qd.quarter} className="space-y-3">
                <h4 className="font-medium text-center">{qd.quarterName}</h4>
                
                {/* Столбики */}
                <div className="flex gap-2 h-32 items-end justify-center">
                  {/* Доходы */}
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className="w-8 bg-green-500 rounded-t transition-all"
                      style={{ 
                        height: `${Math.max((qd.income / maxQuarterlyValue) * 100, 4)}%` 
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Д</span>
                  </div>
                  
                  {/* Расходы */}
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className="w-8 bg-red-500 rounded-t transition-all"
                      style={{ 
                        height: `${Math.max((qd.expense / maxQuarterlyValue) * 100, 4)}%` 
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Р</span>
                  </div>
                </div>
                
                {/* Цифры */}
                <div className="text-center space-y-1">
                  <div className="text-sm">
                    <span className="text-green-600">{formatMoney(qd.income)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-red-600">{formatMoney(qd.expense)}</span>
                  </div>
                  <div className={`text-sm font-bold ${qd.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {qd.profit >= 0 ? '+' : ''}{formatMoney(qd.profit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* График по месяцам */}
      <Card>
        <CardHeader>
          <CardTitle>Доходы и расходы по месяцам</CardTitle>
          <CardDescription>Детализация за {year} год</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map(md => (
              <div key={md.month} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium w-24">{md.monthName}</span>
                  <div className="flex-1 flex gap-4 items-center">
                    {/* Прогресс-бар доходов */}
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(md.income / maxMonthlyValue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-green-600 w-28 text-right">
                      {formatMoney(md.income)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="w-24"></span>
                  <div className="flex-1 flex gap-4 items-center">
                    {/* Прогресс-бар расходов */}
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(md.expense / maxMonthlyValue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-red-600 w-28 text-right">
                      {formatMoney(md.expense)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Легенда */}
          <div className="flex gap-6 mt-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-sm">Доходы</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span className="text-sm">Расходы</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Доступные отчёты */}
      <Card>
        <CardHeader>
          <CardTitle>Доступные отчёты</CardTitle>
          <CardDescription>Формирование и экспорт отчётов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/tenders/accounting/kudir" className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    КУДиР
                  </CardTitle>
                  <CardDescription>
                    Книга учёта доходов и расходов за {year} год
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="h-5 w-5 text-primary" />
                  Декларация УСН
                </CardTitle>
                <CardDescription>
                  Формирование декларации за {year} год
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Сводный отчёт
                </CardTitle>
                <CardDescription>
                  Итоги по доходам, расходам и налогам
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Акт сверки
                </CardTitle>
                <CardDescription>
                  Сверка взаиморасчётов с контрагентом
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Дебиторская задолженность
                </CardTitle>
                <CardDescription>
                  Неоплаченные счета от заказчиков
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  Кредиторская задолженность
                </CardTitle>
                <CardDescription>
                  Неоплаченные счета поставщикам
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
