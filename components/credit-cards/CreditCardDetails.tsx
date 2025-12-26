import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingDown, Calendar, Bell } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import type { CreditCard } from "./CreditCardsList";

type CreditCardDetailsProps = {
  card: CreditCard;
};

// Функция для правильного склонения слова "день"
function getDaysWord(days: number): string {
  const absNum = Math.abs(days);
  const lastDigit = absNum % 10;
  const lastTwoDigits = absNum % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "дней";
  }
  if (lastDigit === 1) {
    return "день";
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }
  return "дней";
}

export default function CreditCardDetails({ card }: CreditCardDetailsProps) {
  const utilizationPercent = Math.round((card.balance / card.limit) * 100);
  
  // Рассчитываем количество дней до платежа
  const calculateDaysUntilPayment = (): number | null => {
    if (!card.nextPaymentDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const paymentDate = new Date(card.nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilPayment = calculateDaysUntilPayment();

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Детали карты</CardTitle></CardHeader><CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Банк:</span><span className="font-medium">{card.bank}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Кредитный лимит:</span><span className="font-medium">{formatMoney(card.limit, card.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Процентная ставка:</span><span className="font-medium">{card.interestRate}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Льготный период:</span><span className="font-medium">{card.gracePeriod} дней</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Задолженность:</span><span className="font-medium">{formatMoney(card.debt ?? 0, card.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Мин. платёж:</span><span className="font-medium">{formatMoney(card.minPayment, card.currency)}</span></div>
            <div className="text-xs text-muted-foreground ml-4 space-y-0.5">
              <div>• Погашение долга ({card.minPaymentPercent}%): {formatMoney(Math.round((card.debt ?? 0) * card.minPaymentPercent / 100), card.currency)}</div>
              {card.monthlyInterest && card.monthlyInterest > 0 ? (
                <div>• Проценты банка ({card.interestRate}% годовых): {formatMoney(card.monthlyInterest, card.currency)}</div>
              ) : card.isInGracePeriod ? (
                <div className="text-green-600">• Льготный период — проценты не начисляются</div>
              ) : null}
            </div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Доступно:</span><span className="font-medium">{formatMoney(card.available, card.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">След. платеж:</span><span className="font-medium">{card.nextPaymentDate ? new Date(card.nextPaymentDate).toLocaleDateString("ru-RU") : "—"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Дней до платежа:</span><span className={cn("font-medium", daysUntilPayment !== null && daysUntilPayment < 0 ? "text-destructive" : daysUntilPayment !== null && daysUntilPayment <= 3 ? "text-yellow-600" : "")}>{daysUntilPayment !== null ? `${daysUntilPayment} ${getDaysWord(daysUntilPayment)}` : "—"}</span></div>
          </div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Использование лимита</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span>Использовано</span><span className="font-bold">{utilizationPercent}%</span></div>
          <Progress value={Math.min(utilizationPercent, 100)} className="h-3" />
          <div className="text-sm text-muted-foreground">{formatMoney(card.balance, card.currency)} из {formatMoney(card.limit, card.currency)}</div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Рекомендации</CardTitle></CardHeader><CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex gap-3 p-3 rounded-lg border"><TrendingDown className="h-8 w-8 text-green-600 flex-shrink-0" /><div><div className="font-medium text-sm">Досрочное погашение</div><div className="text-xs text-muted-foreground">Выплата {formatMoney(card.minPayment * 2, card.currency)} снизит использование</div></div></div>
          <div className="flex gap-3 p-3 rounded-lg border"><Calendar className="h-8 w-8 text-blue-600 flex-shrink-0" /><div><div className="font-medium text-sm">Разбейте платёж</div><div className="text-xs text-muted-foreground">Несколько небольших выплат упростят погашение</div></div></div>
          <div className="flex gap-3 p-3 rounded-lg border"><Bell className="h-8 w-8 text-yellow-600 flex-shrink-0" /><div><div className="font-medium text-sm">Напоминания</div><div className="text-xs text-muted-foreground">Включите напоминания, чтобы не пропустить платеж</div></div></div>
        </div>
      </CardContent></Card>
    </div>
  );
}
