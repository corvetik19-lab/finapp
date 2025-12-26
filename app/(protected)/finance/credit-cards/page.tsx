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
    const minPaymentPercent = card.min_payment_percent ?? 3; // Мин. % от долга (обычно 3-5%)
    const interestRate = card.interest_rate ?? 0; // Годовая ставка (например 25.9%)
    const gracePeriod = card.grace_period ?? 0;
    
    // Рассчитываем мин. платёж:
    // 1. Обязательная часть: % от долга (minPaymentPercent)
    // 2. Проценты банка: годовая ставка / 12 месяцев (если вне льготного периода)
    
    // Определяем, истёк ли льготный период
    // Упрощённо: если есть дата платежа, проверяем прошло ли gracePeriod дней с начала месяца
    let isInGracePeriod = false;
    if (gracePeriod > 0 && card.next_payment_date) {
      const paymentDate = new Date(card.next_payment_date);
      const today = new Date();
      const daysUntilPayment = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      // Если до платежа меньше дней чем льготный период, значит мы в льготном периоде
      isInGracePeriod = daysUntilPayment > 0 && daysUntilPayment <= gracePeriod;
    }
    
    // Базовый платёж (% от долга)
    const basePayment = debt * minPaymentPercent / 100;
    
    // Проценты банка (месячная ставка = годовая / 12)
    const monthlyInterest = isInGracePeriod ? 0 : (debt * interestRate / 12 / 100);
    
    // Итоговый мин. платёж
    const minPayment = Math.round(basePayment + monthlyInterest);
    
    return {
      id: card.id,
      bank: card.name,
      balance: card.balance ?? 0, // доступный остаток в минорных единицах
      limit: card.credit_limit ?? 0,
      available: card.balance ?? 0, // доступный остаток
      debt, // задолженность
      currency: card.currency ?? "RUB",
      interestRate: card.interest_rate ?? 0,
      gracePeriod: card.grace_period ?? 0,
      nextPaymentDate: card.next_payment_date ?? null,
      minPayment, // рассчитанный мин. платёж
      minPaymentPercent, // процент от долга
      monthlyInterest: Math.round(monthlyInterest), // проценты банка за месяц
      isInGracePeriod, // в льготном периоде
      cardNumberLast4: card.card_number_last4 ?? null,
    };
  });

  return <CreditCardsPageClient initialCards={cards} />;
}
