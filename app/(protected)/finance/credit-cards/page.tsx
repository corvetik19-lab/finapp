import CreditCardsPageClient from "@/components/credit-cards/CreditCardsPageClient";
import { createRSCClient } from "@/lib/supabase/server";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function CreditCardsPage() {
  const supabase = await createRSCClient();

  // Загружаем кредитные карты (счета типа 'card' с credit_limit)
  // RLS уже фильтрует по user_id
  const { data: cardsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("type", "card")
    .not("credit_limit", "is", null) // Только кредитные карты (с кредитным лимитом)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const cards = (cardsData ?? []).map((card) => {
    const debt = Math.max(0, (card.credit_limit ?? 0) - (card.balance ?? 0));
    const minPaymentPercent = parseFloat(String(card.min_payment_percent ?? 3));
    const interestRate = parseFloat(String(card.interest_rate ?? 0));
    const gracePeriodDays = card.grace_period ?? 0;
    
    // Расчёт оставшихся дней льготного периода
    let gracePeriodRemaining = 0;
    let isInGracePeriod = false;
    
    if (card.grace_period_active === true && gracePeriodDays > 0) {
      if (card.grace_period_start_date) {
        // Если есть дата начала - рассчитываем оставшиеся дни
        const startDate = new Date(card.grace_period_start_date);
        startDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        gracePeriodRemaining = Math.max(0, gracePeriodDays - daysPassed);
        isInGracePeriod = gracePeriodRemaining > 0;
      } else {
        // Если даты нет - показываем полное значение (для совместимости)
        gracePeriodRemaining = gracePeriodDays;
        isInGracePeriod = true;
      }
    }
    
    // Минимальный платёж:
    // - Если пользователь ввёл вручную (min_payment_amount) - используем его
    // - Иначе рассчитываем автоматически
    let minPayment: number;
    if (card.min_payment_amount != null && card.min_payment_amount > 0) {
      minPayment = card.min_payment_amount;
    } else {
      // Автоматический расчёт: % от долга + проценты (если не льготный период)
      const basePayment = debt * minPaymentPercent / 100;
      const dailyInterest = (debt * interestRate / 100) / 365;
      const monthlyInterest = isInGracePeriod ? 0 : (dailyInterest * 30);
      minPayment = Math.round(basePayment + monthlyInterest);
    }
    
    // Проценты для отображения (рассчитываются как разница: мин.платёж - погашение долга)
    const principalPayment = Math.round(debt * minPaymentPercent / 100);
    const monthlyInterest = Math.max(0, minPayment - principalPayment);
    
    return {
      id: card.id,
      bank: card.name,
      balance: card.balance ?? 0,
      limit: card.credit_limit ?? 0,
      available: card.balance ?? 0,
      debt,
      currency: card.currency ?? "RUB",
      interestRate,
      gracePeriod: gracePeriodDays,
      gracePeriodActive: card.grace_period_active ?? false,
      gracePeriodStartDate: card.grace_period_start_date ?? null,
      nextPaymentDate: card.next_payment_date ?? null,
      minPayment,
      minPaymentPercent,
      monthlyInterest: Math.round(monthlyInterest),
      isInGracePeriod,
      gracePeriodRemaining, // Оставшиеся дни льготного периода (0 если закончился)
      cardNumberLast4: card.card_number_last4 ?? null,
    };
  });

  return <CreditCardsPageClient initialCards={cards} />;
}
