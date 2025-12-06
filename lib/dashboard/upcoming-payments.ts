import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export type UpcomingPaymentRecord = {
  id: string;
  name: string | null;
  due_date: string;
  amount_minor: number;
  currency: string | null;
  account_name: string | null;
  direction: "income" | "expense" | null;
  status: "pending" | "paid" | null;
  paid_at: string | null;
  paid_transaction_id: string | null;
};

export async function loadUpcomingPayments(limit = 10): Promise<UpcomingPaymentRecord[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  // Use local midnight converted to UTC, so we include all of "today" in user's local timezone
  const todayStartLocal = new Date();
  todayStartLocal.setHours(0, 0, 0, 0);
  const todayStartUtcIso = todayStartLocal.toISOString();

  try {
    let query = supabase
      .from("upcoming_payments")
      .select(`
        id,name,due_date,amount_minor,currency,account_name,account_id,direction,status,paid_at,paid_transaction_id,
        accounts:account_id(name),
        transactions:paid_transaction_id(account_id,accounts:account_id(name))
      `)
      .gte("due_date", todayStartUtcIso)
      .order("due_date", { ascending: true })
      .limit(limit);

    // Показываем платежи компании ИЛИ личные (без company_id)
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("loadUpcomingPayments", error);
      return [];
    }

    return (data ?? []).map((item) => {
      // Приоритет получения названия счёта:
      // 1) JOIN из account_id платежа
      // 2) JOIN из account_id транзакции (для старых платежей)
      // 3) Старое поле account_name
      let accountName = item.account_name ?? null;
      
      // Проверяем прямой JOIN по account_id платежа
      if (item.accounts && typeof item.accounts === 'object' && 'name' in item.accounts) {
        accountName = (item.accounts as { name: string }).name;
      }
      // Если нет - проверяем через транзакцию
      else if (item.transactions && typeof item.transactions === 'object') {
        const txn = item.transactions as { accounts?: { name?: string } | null };
        if (txn.accounts && typeof txn.accounts === 'object' && 'name' in txn.accounts) {
          accountName = txn.accounts.name ?? null;
        }
      }

      return {
        id: item.id,
        name: item.name ?? null,
        due_date: item.due_date,
        amount_minor: item.amount_minor ?? 0,
        currency: item.currency ?? null,
        account_name: accountName,
        direction: item.direction ?? null,
        status: (item.status as "pending" | "paid" | null) ?? "pending",
        paid_at: item.paid_at ?? null,
        paid_transaction_id: item.paid_transaction_id ?? null,
      };
    });
  } catch (error) {
    console.warn("loadUpcomingPayments: unexpected", error);
    return [];
  }
}
