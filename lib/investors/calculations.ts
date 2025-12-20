// Расчёты для модуля Инвесторы

import type { InterestType, FundingStructure } from "./types";

// ============================================
// Расчёт процентов
// ============================================

export interface InterestCalculationInput {
  principal: number;        // Сумма в копейках
  interestRate: number;     // Процентная ставка
  interestType: InterestType;
  periodDays: number;       // Срок в днях
}

export interface InterestCalculationResult {
  interestAmount: number;   // Сумма процентов в копейках
  totalReturn: number;      // Всего к возврату в копейках
}

export function calculateInterest(input: InterestCalculationInput): InterestCalculationResult {
  const { principal, interestRate, interestType, periodDays } = input;
  
  let interestAmount = 0;
  
  switch (interestType) {
    case "annual":
      // Годовая ставка: principal × (rate/100) × (days/365)
      interestAmount = Math.round(principal * (interestRate / 100) * (periodDays / 365));
      break;
      
    case "monthly": {
      // Месячная ставка: principal × (rate/100) × months
      const months = periodDays / 30;
      interestAmount = Math.round(principal * (interestRate / 100) * months);
      break;
    }
      
    case "fixed":
      // Фиксированная ставка: principal × (rate/100)
      interestAmount = Math.round(principal * (interestRate / 100));
      break;
  }
  
  return {
    interestAmount,
    totalReturn: principal + interestAmount,
  };
}

// ============================================
// Генерация графика возвратов
// ============================================

export type ScheduleType = "single" | "monthly" | "quarterly";

export interface GenerateScheduleInput {
  investmentId: string;
  principal: number;        // Основной долг в копейках
  interest: number;         // Проценты в копейках
  dueDate: string;          // Дата окончания (YYYY-MM-DD)
  scheduleType: ScheduleType;
  startDate?: string;       // Дата начала (по умолчанию - сегодня)
}

export interface ScheduleItem {
  payment_number: number;
  scheduled_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
}

export function generateReturnSchedule(input: GenerateScheduleInput): ScheduleItem[] {
  const { principal, interest, dueDate, scheduleType, startDate } = input;
  
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(dueDate);
  
  const items: ScheduleItem[] = [];
  
  switch (scheduleType) {
    case "single":
      // Один платёж в конце срока
      items.push({
        payment_number: 1,
        scheduled_date: dueDate,
        principal_amount: principal,
        interest_amount: interest,
        total_amount: principal + interest,
      });
      break;
      
    case "monthly": {
      // Ежемесячные платежи
      const monthsDiff = monthsBetween(start, end);
      const paymentsCount = Math.max(1, monthsDiff);
      
      const monthlyPrincipal = Math.floor(principal / paymentsCount);
      const monthlyInterest = Math.floor(interest / paymentsCount);
      
      let remainingPrincipal = principal;
      let remainingInterest = interest;
      
      for (let i = 1; i <= paymentsCount; i++) {
        const paymentDate = addMonths(start, i);
        
        // Последний платёж - остаток
        const isLast = i === paymentsCount;
        const principalPayment = isLast ? remainingPrincipal : monthlyPrincipal;
        const interestPayment = isLast ? remainingInterest : monthlyInterest;
        
        items.push({
          payment_number: i,
          scheduled_date: formatDate(paymentDate),
          principal_amount: principalPayment,
          interest_amount: interestPayment,
          total_amount: principalPayment + interestPayment,
        });
        
        remainingPrincipal -= principalPayment;
        remainingInterest -= interestPayment;
      }
      break;
    }
    
    case "quarterly": {
      // Ежеквартальные платежи
      const quartersDiff = Math.ceil(monthsBetween(start, end) / 3);
      const paymentsCount = Math.max(1, quartersDiff);
      
      const quarterlyPrincipal = Math.floor(principal / paymentsCount);
      const quarterlyInterest = Math.floor(interest / paymentsCount);
      
      let remainingPrincipal = principal;
      let remainingInterest = interest;
      
      for (let i = 1; i <= paymentsCount; i++) {
        const paymentDate = addMonths(start, i * 3);
        
        const isLast = i === paymentsCount;
        const principalPayment = isLast ? remainingPrincipal : quarterlyPrincipal;
        const interestPayment = isLast ? remainingInterest : quarterlyInterest;
        
        items.push({
          payment_number: i,
          scheduled_date: formatDate(paymentDate),
          principal_amount: principalPayment,
          interest_amount: interestPayment,
          total_amount: principalPayment + interestPayment,
        });
        
        remainingPrincipal -= principalPayment;
        remainingInterest -= interestPayment;
      }
      break;
    }
  }
  
  return items;
}

// ============================================
// Расчёт структуры финансирования
// ============================================

export interface InvestmentItem {
  sourceId: string;
  sourceName: string;
  amount: number;
  interestRate: number;
  interestType: InterestType;
  periodDays: number;
}

export function calculateFundingStructure(
  tenderTotalCost: number,
  investments: InvestmentItem[],
  ownFunds: number
): FundingStructure {
  const investmentDetails = investments.map((inv) => {
    const calc = calculateInterest({
      principal: inv.amount,
      interestRate: inv.interestRate,
      interestType: inv.interestType,
      periodDays: inv.periodDays,
    });
    
    return {
      sourceId: inv.sourceId,
      sourceName: inv.sourceName,
      amount: inv.amount,
      share: tenderTotalCost > 0 ? (inv.amount / tenderTotalCost) * 100 : 0,
      interestRate: inv.interestRate,
      interestAmount: calc.interestAmount,
    };
  });
  
  const totalInterestCost = investmentDetails.reduce((sum, inv) => sum + inv.interestAmount, 0);
  
  return {
    tenderTotalCost,
    investments: investmentDetails,
    ownFunds,
    ownFundsShare: tenderTotalCost > 0 ? (ownFunds / tenderTotalCost) * 100 : 0,
    totalInterestCost,
  };
}

// ============================================
// Расчёт остатка задолженности
// ============================================

export interface DebtBalance {
  principalRemaining: number;
  interestRemaining: number;
  totalRemaining: number;
  isOverdue: boolean;
  overdueAmount: number;
  overdueDays: number;
}

export function calculateDebtBalance(
  principal: number,
  interest: number,
  returnedPrincipal: number,
  returnedInterest: number,
  dueDate: string
): DebtBalance {
  const principalRemaining = principal - returnedPrincipal;
  const interestRemaining = interest - returnedInterest;
  const totalRemaining = principalRemaining + interestRemaining;
  
  const today = new Date();
  const due = new Date(dueDate);
  const isOverdue = today > due && totalRemaining > 0;
  
  let overdueDays = 0;
  if (isOverdue) {
    overdueDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  return {
    principalRemaining,
    interestRemaining,
    totalRemaining,
    isOverdue,
    overdueAmount: isOverdue ? totalRemaining : 0,
    overdueDays,
  };
}

// ============================================
// Расчёт пени за просрочку
// ============================================

export function calculatePenalty(
  overdueAmount: number,
  overdueDays: number,
  penaltyRate: number = 0.1 // 0.1% в день по умолчанию
): number {
  return Math.round(overdueAmount * (penaltyRate / 100) * overdueDays);
}

// ============================================
// Вспомогательные функции
// ============================================

function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================
// Форматирование для отображения
// ============================================

export function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kopeks / 100);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value) + "%";
}

export function formatDays(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${days} дней`;
  }
  
  if (lastDigit === 1) {
    return `${days} день`;
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${days} дня`;
  }
  
  return `${days} дней`;
}
