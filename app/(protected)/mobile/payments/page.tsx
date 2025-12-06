import { loadUpcomingPayments } from "@/lib/dashboard/upcoming-payments";
import UpcomingPaymentsCard from "@/components/dashboard/UpcomingPaymentsCard";
export const dynamic = 'force-dynamic';

export default async function MobilePaymentsPage() {
  const upcomingPaymentsRaw = await loadUpcomingPayments(6);
  
  const upcomingPayments = upcomingPaymentsRaw.map((p) => ({
    id: p.id,
    name: p.name || "",
    dueDate: p.due_date,
    amountMinor: p.amount_minor,
    currency: p.currency || "RUB",
    accountName: p.account_name || "",
    direction: p.direction || "expense",
    status: p.status || "pending",
    paidAt: p.paid_at,
    paidTransactionId: p.paid_transaction_id,
  }));

  return (
    <div className="p-4">
      <UpcomingPaymentsCard payments={upcomingPayments} />
    </div>
  );
}
