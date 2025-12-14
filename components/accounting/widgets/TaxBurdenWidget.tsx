"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

interface TaxBurdenData {
  period: string;
  revenue: number;       // Выручка (в копейках)
  expenses: number;      // Расходы (в копейках)
  profit: number;        // Прибыль (в копейках)
  
  // Налоги
  incomeTax: number;     // Налог на прибыль / УСН
  vatPaid: number;       // НДС к уплате
  insurancePremiums: number; // Страховые взносы
  otherTaxes: number;    // Прочие налоги
  
  // Расчётные показатели
  totalTaxes: number;    // Всего налогов
  taxBurdenPercent: number; // Налоговая нагрузка %
  industryAverage: number;  // Среднеотраслевой показатель %
  
  // Налоговый режим
  taxSystem: "osno" | "usn_income" | "usn_income_expense";
}

interface TaxBurdenWidgetProps {
  data: TaxBurdenData;
}

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopeks / 100);
}

const TAX_SYSTEM_NAMES: Record<string, string> = {
  osno: "ОСНО",
  usn_income: "УСН Доходы",
  usn_income_expense: "УСН Доходы-Расходы",
};

export function TaxBurdenWidget({ data }: TaxBurdenWidgetProps) {
  const isAboveAverage = data.taxBurdenPercent > data.industryAverage;
  const isBelowSafe = data.taxBurdenPercent < data.industryAverage * 0.7; // Ниже 70% от среднего - риск
  
  const getStatusColor = () => {
    if (isBelowSafe) return "text-orange-600";
    if (isAboveAverage) return "text-green-600";
    return "text-blue-600";
  };
  
  const getStatusIcon = () => {
    if (isBelowSafe) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (isAboveAverage) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };
  
  const getStatusText = () => {
    if (isBelowSafe) return "Ниже среднеотраслевого (риск)";
    if (isAboveAverage) return "Выше среднеотраслевого";
    return "В пределах нормы";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Налоговая нагрузка
          </CardTitle>
          <Badge variant="outline">
            {TAX_SYSTEM_NAMES[data.taxSystem]}
          </Badge>
        </div>
        <CardDescription>{data.period}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Основной показатель */}
        <div className="text-center py-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            {getStatusIcon()}
            <span className={`text-3xl font-bold ${getStatusColor()}`}>
              {data.taxBurdenPercent.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{getStatusText()}</p>
        </div>

        {/* Сравнение со среднеотраслевым */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Среднеотраслевой показатель</span>
            <span className="font-medium">{data.industryAverage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={Math.min((data.taxBurdenPercent / data.industryAverage) * 100, 150)} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>{data.industryAverage}% (средний)</span>
            <span>{(data.industryAverage * 1.5).toFixed(0)}%</span>
          </div>
        </div>

        {/* Структура налогов */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Структура налогов</h4>
          
          <div className="space-y-1">
            {data.taxSystem === "osno" ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Налог на прибыль</span>
                  <span>{formatMoney(data.incomeTax)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">НДС к уплате</span>
                  <span>{formatMoney(data.vatPaid)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">УСН</span>
                <span>{formatMoney(data.incomeTax)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Страховые взносы</span>
              <span>{formatMoney(data.insurancePremiums)}</span>
            </div>
            
            {data.otherTaxes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Прочие налоги</span>
                <span>{formatMoney(data.otherTaxes)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
            <span>Всего налогов</span>
            <span className="text-red-600">{formatMoney(data.totalTaxes)}</span>
          </div>
        </div>

        {/* Выручка и прибыль */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2 bg-green-50 rounded">
            <p className="text-xs text-green-700">Выручка</p>
            <p className="font-medium text-green-600">{formatMoney(data.revenue)}</p>
          </div>
          <div className="p-2 bg-blue-50 rounded">
            <p className="text-xs text-blue-700">Прибыль</p>
            <p className="font-medium text-blue-600">{formatMoney(data.profit)}</p>
          </div>
        </div>

        {/* Предупреждение */}
        {isBelowSafe && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div className="text-xs text-orange-800">
                <p className="font-medium">Внимание!</p>
                <p>Налоговая нагрузка значительно ниже среднеотраслевой. 
                   Это может привлечь внимание ФНС.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Сервис для расчёта налоговой нагрузки
// ============================================

export interface TaxBurdenCalculationInput {
  revenue: number;
  expenses: number;
  vatReceived: number;
  vatPaid: number;
  salaryExpenses: number;
  taxSystem: "osno" | "usn_income" | "usn_income_expense";
  usnRate?: number;
}

export function calculateTaxBurden(input: TaxBurdenCalculationInput): TaxBurdenData {
  const { revenue, expenses, vatReceived, vatPaid, salaryExpenses, taxSystem, usnRate = 6 } = input;
  
  const profit = revenue - expenses;
  
  let incomeTax = 0;
  let vatToPay = 0;
  
  // Расчёт налогов в зависимости от системы
  if (taxSystem === "osno") {
    // ОСНО: налог на прибыль 20% + НДС
    incomeTax = Math.max(0, profit * 0.2);
    vatToPay = Math.max(0, vatReceived - vatPaid);
  } else if (taxSystem === "usn_income") {
    // УСН Доходы: 6% от выручки
    incomeTax = revenue * (usnRate / 100);
  } else {
    // УСН Доходы-Расходы: 15% от прибыли, минимум 1% от выручки
    const tax15 = Math.max(0, profit * 0.15);
    const minTax = revenue * 0.01;
    incomeTax = Math.max(tax15, minTax);
  }
  
  // Страховые взносы (примерно 30% от ФОТ)
  const insurancePremiums = salaryExpenses * 0.3;
  
  const totalTaxes = incomeTax + vatToPay + insurancePremiums;
  const taxBurdenPercent = revenue > 0 ? (totalTaxes / revenue) * 100 : 0;
  
  // Среднеотраслевые показатели (примерные)
  const industryAverages: Record<string, number> = {
    osno: 10.5,
    usn_income: 3.5,
    usn_income_expense: 4.5,
  };
  
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  
  return {
    period: `${currentQuarter} квартал ${currentYear}`,
    revenue,
    expenses,
    profit,
    incomeTax: Math.round(incomeTax),
    vatPaid: Math.round(vatToPay),
    insurancePremiums: Math.round(insurancePremiums),
    otherTaxes: 0,
    totalTaxes: Math.round(totalTaxes),
    taxBurdenPercent,
    industryAverage: industryAverages[taxSystem] || 5,
    taxSystem,
  };
}
