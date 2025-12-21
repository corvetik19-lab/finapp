import { createRSCClient } from "@/lib/supabase/server";
import { PaymentScheduleClient } from "./schedule-client";

export default async function InvestorSchedulePage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: investments } = await supabase
    .from("investments")
    .select(`
      id,
      investment_number,
      approved_amount,
      total_return_amount,
      returned_principal,
      returned_interest,
      status,
      due_date,
      interest_rate
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "in_progress", "overdue"])
    .order("due_date", { ascending: true });

  // Формируем список платежей
  const payments = (investments || []).map((inv) => {
    const returned = (inv.returned_principal || 0) + (inv.returned_interest || 0);
    const remaining = inv.total_return_amount - returned;

    return {
      id: inv.id,
      investment_number: inv.investment_number,
      source_name: "—",
      tender_subject: "—",
      due_date: inv.due_date,
      total_amount: inv.total_return_amount,
      remaining_amount: remaining,
      status: inv.status,
    };
  });

  return <PaymentScheduleClient payments={payments} />;
}
