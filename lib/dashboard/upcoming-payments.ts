import { createRSCClient } from "@/lib/supabase/helpers";

export type UpcomingPaymentRecord = {
  id: string;
  name: string | null;
  due_date: string;
  amount_minor: number;
  currency: string | null;
  account_name: string | null;
  direction: "income" | "expense" | null;
  description: string | null;
};

export async function loadUpcomingPayments(limit = 10): Promise<UpcomingPaymentRecord[]> {
  const supabase = await createRSCClient();
  // Use local midnight converted to UTC, so we include all of "today" in user's local timezone
  const todayStartLocal = new Date();
  todayStartLocal.setHours(0, 0, 0, 0);
  const todayStartUtcIso = todayStartLocal.toISOString();

  try {
    const { data, error } = await supabase
      .from("upcoming_payments")
      .select("id,name,due_date,amount_minor,currency,account_name,direction,description")
      .gte("due_date", todayStartUtcIso)
      .order("due_date", { ascending: true })
      .limit(limit);

    if (error) {
      console.warn("loadUpcomingPayments", error);
      return [];
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      name: item.name ?? null,
      due_date: item.due_date,
      amount_minor: item.amount_minor ?? 0,
      currency: item.currency ?? null,
      account_name: item.account_name ?? null,
      direction: item.direction ?? null,
      description: item.description ?? null,
    }));
  } catch (error) {
    console.warn("loadUpcomingPayments: unexpected", error);
    return [];
  }
}
