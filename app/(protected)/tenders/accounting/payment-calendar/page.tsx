import { Metadata } from "next";
import { getPaymentCalendar, getPaymentCalendarSummary } from "@/lib/accounting/payment-calendar";
import { getCounterparties } from "@/lib/accounting/service";
import { PaymentCalendarPage } from "@/components/accounting/PaymentCalendarPage";

export const metadata: Metadata = {
  title: "Платёжный календарь | Бухгалтерия",
  description: "Планирование и учёт платежей",
};

export default async function PaymentCalendarRoute() {
  // Получаем платежи на 3 месяца вперёд
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const [payments, summary, counterparties] = await Promise.all([
    getPaymentCalendar({
      startDate: today.toISOString().split("T")[0],
      endDate: threeMonthsLater.toISOString().split("T")[0],
    }),
    getPaymentCalendarSummary(),
    getCounterparties(),
  ]);

  return (
    <PaymentCalendarPage
      payments={payments}
      summary={summary}
      counterparties={counterparties}
    />
  );
}
