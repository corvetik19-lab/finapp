"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  Percent,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatMoney as formatMoneyUtil } from "@/lib/investors/calculations";

type InterestType = "annual" | "monthly" | "fixed";

interface CalculationResult {
  principal: number;
  interestAmount: number;
  totalReturn: number;
  effectiveRate: number;
  dailyRate: number;
  monthlyPayment: number;
  profitAfterInterest: number;
  profitMargin: number;
  breakEvenPrice: number;
}

export default function InvestorCalculatorPage() {
  const [tenderAmount, setTenderAmount] = useState<number>(1000000);
  const [ownFunds, setOwnFunds] = useState<number>(200000);
  const [investmentAmount, setInvestmentAmount] = useState<number>(800000);
  const [interestRate, setInterestRate] = useState<number>(24);
  const [interestType, setInterestType] = useState<InterestType>("annual");
  const [periodDays, setPeriodDays] = useState<number>(90);
  const [expectedProfit, setExpectedProfit] = useState<number>(150000);

  const formatMoney = (value: number): string => {
    return formatMoneyUtil(value * 100);
  };

  const calculation = useMemo((): CalculationResult => {
    let interestAmount = 0;
    let effectiveRate = 0;
    let dailyRate = 0;

    switch (interestType) {
      case "annual":
        dailyRate = interestRate / 365;
        interestAmount = (investmentAmount * interestRate * periodDays) / 365 / 100;
        effectiveRate = (interestRate * periodDays) / 365;
        break;
      case "monthly":
        dailyRate = (interestRate * 12) / 365;
        interestAmount = (investmentAmount * interestRate * periodDays) / 30 / 100;
        effectiveRate = (interestRate * periodDays) / 30;
        break;
      case "fixed":
        interestAmount = (investmentAmount * interestRate) / 100;
        effectiveRate = interestRate;
        dailyRate = interestRate / periodDays;
        break;
    }

    const totalReturn = investmentAmount + interestAmount;
    const monthlyPayment = totalReturn / (periodDays / 30);
    const profitAfterInterest = expectedProfit - interestAmount;
    const profitMargin = tenderAmount > 0 ? (profitAfterInterest / tenderAmount) * 100 : 0;
    const breakEvenPrice = tenderAmount - expectedProfit + interestAmount;

    return {
      principal: investmentAmount,
      interestAmount,
      totalReturn,
      effectiveRate,
      dailyRate,
      monthlyPayment,
      profitAfterInterest,
      profitMargin,
      breakEvenPrice,
    };
  }, [tenderAmount, investmentAmount, interestRate, interestType, periodDays, expectedProfit]);

  const handleTenderAmountChange = (value: number) => {
    setTenderAmount(value);
    const newInvestment = Math.max(0, value - ownFunds);
    setInvestmentAmount(newInvestment);
  };

  const handleOwnFundsChange = (value: number) => {
    setOwnFunds(value);
    const newInvestment = Math.max(0, tenderAmount - value);
    setInvestmentAmount(newInvestment);
  };

  const isProfitable = calculation.profitAfterInterest > 0;
  const investmentShare = tenderAmount > 0 ? (investmentAmount / tenderAmount) * 100 : 0;
  const ownFundsShare = tenderAmount > 0 ? (ownFunds / tenderAmount) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Калькулятор стоимости финансирования
        </h1>
        <p className="text-muted-foreground">
          Рассчитайте стоимость привлечения инвестиций для тендера
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Параметры */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Параметры тендера</CardTitle>
              <CardDescription>Укажите стоимость и структуру финансирования</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Стоимость тендера (НМЦ)</Label>
                <Input
                  type="number"
                  value={tenderAmount}
                  onChange={(e) => handleTenderAmountChange(Number(e.target.value))}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">{formatMoney(tenderAmount)}</p>
              </div>

              <div className="space-y-2">
                <Label>Собственные средства</Label>
                <Input
                  type="number"
                  value={ownFunds}
                  onChange={(e) => handleOwnFundsChange(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatMoney(ownFunds)}</span>
                  <span>{ownFundsShare.toFixed(1)}% от стоимости</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Сумма инвестиции</Label>
                <Input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatMoney(investmentAmount)}</span>
                  <span>{investmentShare.toFixed(1)}% от стоимости</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ожидаемая прибыль по тендеру</Label>
                <Input
                  type="number"
                  value={expectedProfit}
                  onChange={(e) => setExpectedProfit(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">{formatMoney(expectedProfit)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Условия инвестиции</CardTitle>
              <CardDescription>Параметры займа</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Процентная ставка</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      step="0.1"
                    />
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Тип ставки</Label>
                  <Select
                    value={interestType}
                    onValueChange={(v) => setInterestType(v as InterestType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Годовая</SelectItem>
                      <SelectItem value="monthly">Месячная</SelectItem>
                      <SelectItem value="fixed">Фиксированная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Срок (дней)</Label>
                  <span className="text-sm font-medium">{periodDays} дн.</span>
                </div>
                <Slider
                  value={[periodDays]}
                  onValueChange={([v]) => setPeriodDays(v)}
                  min={30}
                  max={365}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30 дней</span>
                  <span>≈ {(periodDays / 30).toFixed(1)} мес.</span>
                  <span>365 дней</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Результаты */}
        <div className="space-y-6">
          <Card className={isProfitable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isProfitable ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                Результат расчёта
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white">
                  <p className="text-sm text-muted-foreground">Стоимость процентов</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatMoney(calculation.interestAmount)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white">
                  <p className="text-sm text-muted-foreground">К возврату всего</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(calculation.totalReturn)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg bg-white">
                <p className="text-sm text-muted-foreground">Прибыль после процентов</p>
                <p className={`text-3xl font-bold ${isProfitable ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(calculation.profitAfterInterest)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Маржа: {calculation.profitMargin.toFixed(2)}%
                </p>
              </div>

              {!isProfitable && (
                <div className="p-4 rounded-lg bg-red-100 text-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Внимание: убыточная сделка!</p>
                      <p className="text-sm mt-1">
                        Стоимость финансирования превышает ожидаемую прибыль.
                        Рассмотрите снижение ставки или увеличение собственных средств.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Детали расчёта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between p-3 rounded bg-muted">
                  <span className="text-muted-foreground">Эффективная ставка:</span>
                  <span className="font-medium">{calculation.effectiveRate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between p-3 rounded bg-muted">
                  <span className="text-muted-foreground">Дневная ставка:</span>
                  <span className="font-medium">{calculation.dailyRate.toFixed(4)}%</span>
                </div>
                <div className="flex justify-between p-3 rounded bg-muted">
                  <span className="text-muted-foreground">Ежемесячный платёж:</span>
                  <span className="font-medium">{formatMoney(calculation.monthlyPayment)}</span>
                </div>
                <div className="flex justify-between p-3 rounded bg-muted">
                  <span className="text-muted-foreground">Точка безубыточности:</span>
                  <span className="font-medium">{formatMoney(calculation.breakEvenPrice)}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 text-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Рекомендации:</p>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {investmentShare > 80 && (
                        <li>Высокая доля заёмных средств ({investmentShare.toFixed(0)}%). 
                            Рассмотрите увеличение собственного участия.</li>
                      )}
                      {calculation.effectiveRate > 10 && (
                        <li>Высокая эффективная ставка. Сравните условия разных источников.</li>
                      )}
                      {periodDays > 180 && (
                        <li>Длительный срок займа увеличивает стоимость финансирования.</li>
                      )}
                      {isProfitable && calculation.profitMargin < 5 && (
                        <li>Низкая маржа после процентов. Есть риск убытка при непредвиденных расходах.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Сравнение сценариев */}
          <Card>
            <CardHeader>
              <CardTitle>Сравнение ставок</CardTitle>
              <CardDescription>Как изменится прибыль при разных условиях</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[12, 18, 24, 30, 36].map((rate) => {
                  let interest = 0;
                  switch (interestType) {
                    case "annual":
                      interest = (investmentAmount * rate * periodDays) / 365 / 100;
                      break;
                    case "monthly":
                      interest = (investmentAmount * rate * periodDays) / 30 / 100;
                      break;
                    case "fixed":
                      interest = (investmentAmount * rate) / 100;
                      break;
                  }
                  const profit = expectedProfit - interest;
                  const isCurrentRate = rate === interestRate;

                  return (
                    <div
                      key={rate}
                      className={`flex items-center justify-between p-3 rounded ${
                        isCurrentRate ? "bg-blue-100 border-2 border-blue-500" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={isCurrentRate ? "default" : "outline"}>
                          {rate}%
                        </Badge>
                        {isCurrentRate && <span className="text-xs text-blue-600">текущая</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-4">
                          Проценты: {formatMoney(interest)}
                        </span>
                        <span className={`font-medium ${profit > 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatMoney(profit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
