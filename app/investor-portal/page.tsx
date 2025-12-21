import { createRSCClient } from "@/lib/supabase/server";
import { InvestorPortalDashboard } from "./dashboard-client";

export default async function InvestorPortalPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Получаем инвестиции пользователя (где он является инвестором/источником)
  const { data: investments } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources!investments_source_id_fkey(id, name, source_type),
      tender:tenders(id, subject, purchase_number, status)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Статистика
  const stats = {
    totalInvested: 0,
    totalToReturn: 0,
    totalReturned: 0,
    activeCount: 0,
    overdueCount: 0,
  };

  const activeInvestments: typeof investments = [];
  const upcomingPayments: Array<{
    id: string;
    investment_number: string;
    amount: number;
    due_date: string;
    tender_subject: string;
  }> = [];

  if (investments) {
    for (const inv of investments) {
      stats.totalInvested += inv.approved_amount || 0;
      stats.totalToReturn += inv.total_return_amount || 0;
      stats.totalReturned += (inv.returned_principal || 0) + (inv.returned_interest || 0);

      if (inv.status === "active" || inv.status === "in_progress") {
        stats.activeCount++;
        activeInvestments.push(inv);

        const remaining = inv.total_return_amount - (inv.returned_principal || 0) - (inv.returned_interest || 0);
        if (remaining > 0) {
          upcomingPayments.push({
            id: inv.id,
            investment_number: inv.investment_number,
            amount: remaining,
            due_date: inv.due_date,
            tender_subject: inv.tender?.subject || "—",
          });
        }
      }

      if (inv.status === "overdue") {
        stats.overdueCount++;
      }
    }
  }

  // Сортируем платежи по дате
  upcomingPayments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <InvestorPortalDashboard
      stats={stats}
      activeInvestments={activeInvestments || []}
      upcomingPayments={upcomingPayments.slice(0, 5)}
    />
  );
}
