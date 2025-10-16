import CreditCardsPageClient from "@/components/credit-cards/CreditCardsPageClient";
import { createRSCClient } from "@/lib/supabase/server";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function CreditCardsPage() {
  const supabase = await createRSCClient();

  // Загружаем кредитные карты (счета типа 'card' с credit_limit)
  const { data: cardsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("type", "card")
    .not("credit_limit", "is", null) // Только кредитные карты (с кредитным лимитом)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const cards = (cardsData ?? []).map((card) => ({
    id: card.id,
    bank: card.name,
    balance: Math.abs(card.balance ?? 0), // задолженность в минорных единицах
    limit: card.credit_limit ?? 0,
    available: Math.max(0, (card.credit_limit ?? 0) - Math.abs(card.balance ?? 0)),
    currency: card.currency ?? "RUB",
    interestRate: card.interest_rate ?? 0,
    gracePeriod: card.grace_period ?? 0,
    nextPaymentDate: card.next_payment_date ?? null,
    minPayment: card.min_payment ?? 0,
    cardNumberLast4: card.card_number_last4 ?? null,
  }));

  return <CreditCardsPageClient initialCards={cards} />;
}
