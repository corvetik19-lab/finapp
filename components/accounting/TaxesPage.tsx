"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  ArrowLeft,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Landmark
} from "lucide-react";
import { 
  TaxPayment,
  KudirEntry,
  AccountingSettings,
  formatMoney,
  getQuarterName,
  TAX_SYSTEMS,
  TAX_CONSTANTS,
  TAX_PAYMENT_STATUSES
} from "@/lib/accounting/types";

interface TaxesPageProps {
  payments: TaxPayment[];
  kudirEntries: KudirEntry[];
  settings: AccountingSettings | null;
  year: number;
}

export function TaxesPage({ payments, kudirEntries, settings, year }: TaxesPageProps) {
  // Расчёт доходов и расходов по кварталам
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
      const deductible = quarterEntries.reduce((sum, e) => sum + (e.deductible_expense || 0), 0);
      
      return { quarter, income, expense, deductible };
    });
  }, [kudirEntries]);

  // Накопительный итог
  const cumulativeData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalDeductible = 0;
    
    return quarterlyData.map(qd => {
      totalIncome += qd.income;
      totalExpense += qd.expense;
      totalDeductible += qd.deductible;
      
      return {
        quarter: qd.quarter,
        cumulativeIncome: totalIncome,
        cumulativeExpense: totalExpense,
        cumulativeDeductible: totalDeductible,
      };
    });
  }, [quarterlyData]);

  // Расчёт налога УСН по кварталам
  const taxCalculations = useMemo(() => {
    if (!settings) return [];
    
    const rate = settings.usn_rate || 6;
    const isIncomeExpense = settings.tax_system === 'usn_income_expense';
    let prevTaxPaid = 0;
    
    return cumulativeData.map(cd => {
      const taxBase = isIncomeExpense 
        ? cd.cumulativeIncome - cd.cumulativeDeductible
        : cd.cumulativeIncome;
      
      let calculatedTax = Math.round(taxBase * rate / 100);
      
      // Минимальный налог для УСН Доходы-Расходы (только за год)
      if (isIncomeExpense && cd.quarter === 4) {
        const minTax = Math.round(cd.cumulativeIncome * (settings.usn_min_tax_rate || 1) / 100);
        if (calculatedTax < minTax) {
          calculatedTax = minTax;
        }
      }
      
      // Авансовый платёж = налог - ранее уплаченное
      const advancePayment = Math.max(0, calculatedTax - prevTaxPaid);
      prevTaxPaid = calculatedTax;
      
      return {
        quarter: cd.quarter,
        taxBase,
        calculatedTax,
        advancePayment,
        cumulativeIncome: cd.cumulativeIncome,
      };
    });
  }, [cumulativeData, settings]);

  // Страховые взносы ИП
  const insuranceCalculation = useMemo(() => {
    if (!settings || settings.organization_type !== 'ip') return null;
    
    const totalIncome = cumulativeData[3]?.cumulativeIncome || 0;
    const fixedAmount = TAX_CONSTANTS.IP_INSURANCE_FIXED_2024;
    
    // 1% с дохода свыше 300 000 ₽
    const excessIncome = Math.max(0, totalIncome - TAX_CONSTANTS.IP_INCOME_THRESHOLD);
    const additionalAmount = Math.min(
      Math.round(excessIncome / 100),
      TAX_CONSTANTS.IP_MAX_INSURANCE_BASE - fixedAmount
    );
    
    return {
      fixedAmount,
      additionalAmount,
      totalAmount: fixedAmount + additionalAmount,
      excessIncome,
    };
  }, [cumulativeData, settings]);

  // Годовой итог
  const yearTotal = useMemo(() => {
    const totalIncome = kudirEntries.reduce((sum, e) => sum + (e.income || 0), 0);
    const totalExpense = kudirEntries.reduce((sum, e) => sum + (e.expense || 0), 0);
    const totalTax = taxCalculations[3]?.calculatedTax || 0;
    
    return {
      income: totalIncome,
      expense: totalExpense,
      profit: totalIncome - totalExpense,
      tax: totalTax,
    };
  }, [kudirEntries, taxCalculations]);

  const taxSystemInfo = settings ? TAX_SYSTEMS[settings.tax_system] : null;

  if (!settings) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Настройте бухгалтерию</CardTitle>
            <CardDescription>
              Для расчёта налогов необходимо настроить организацию и систему налогообложения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tenders/accounting/settings">
                Перейти к настройкам
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Calculator className="h-7 w-7 text-primary" />
              Налоги
            </h1>
            <p className="text-muted-foreground">
              {year} год • {taxSystemInfo?.name} ({settings.usn_rate}%)
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/tenders/accounting/taxes/calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Календарь платежей
          </Link>
        </Button>
      </div>

      {/* Годовой итог */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доходы за год</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(yearTotal.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Расходы за год</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(yearTotal.expense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <Landmark className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${yearTotal.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(yearTotal.profit)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Налог за год</CardTitle>
            <Calculator className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatMoney(yearTotal.tax)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Расчёт по кварталам */}
      <Card>
        <CardHeader>
          <CardTitle>Авансовые платежи по кварталам</CardTitle>
          <CardDescription>
            Расчёт {taxSystemInfo?.name} ({settings.usn_rate}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {taxCalculations.map(tc => {
              const payment = payments.find(
                p => p.tax_type === 'usn' && p.period_quarter === tc.quarter
              );
              const isPaid = payment?.status === 'paid';
              const isOverdue = payment?.status === 'overdue';
              
              return (
                <Card key={tc.quarter} className={isPaid ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      {getQuarterName(tc.quarter)}
                      {isPaid && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {isOverdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Доход (накоп.)</p>
                      <p className="font-medium">{formatMoney(tc.cumulativeIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Налоговая база</p>
                      <p className="font-medium">{formatMoney(tc.taxBase)}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">К уплате</p>
                      <p className="text-xl font-bold text-primary">
                        {formatMoney(tc.advancePayment)}
                      </p>
                    </div>
                    {payment && (
                      <Badge 
                        variant="secondary"
                        style={{ 
                          backgroundColor: `${TAX_PAYMENT_STATUSES[payment.status]?.color}20`,
                          color: TAX_PAYMENT_STATUSES[payment.status]?.color 
                        }}
                      >
                        {TAX_PAYMENT_STATUSES[payment.status]?.name}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Страховые взносы ИП */}
      {insuranceCalculation && (
        <Card>
          <CardHeader>
            <CardTitle>Страховые взносы ИП</CardTitle>
            <CardDescription>
              Фиксированные взносы и 1% с дохода свыше 300 000 ₽
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Фиксированные взносы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatMoney(insuranceCalculation.fixedAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Срок: до 31 декабря {year}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    1% с превышения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatMoney(insuranceCalculation.additionalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {insuranceCalculation.excessIncome > 0 
                      ? `Доход свыше 300 000: ${formatMoney(insuranceCalculation.excessIncome)}`
                      : 'Нет превышения'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Срок: до 1 июля {year + 1}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Всего взносов
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {formatMoney(insuranceCalculation.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Можно уменьшить налог УСН
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Сроки уплаты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Сроки уплаты налогов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">УСН - авансовые платежи</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• I квартал — до 28 апреля</li>
                  <li>• II квартал — до 28 июля</li>
                  <li>• III квартал — до 28 октября</li>
                  <li>• Год — до 28 апреля следующего года</li>
                </ul>
              </div>

              {settings.organization_type === 'ip' && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Страховые взносы ИП</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Фиксированные — до 31 декабря</li>
                    <li>• 1% свыше 300 000 ₽ — до 1 июля следующего года</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
