import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export type CategoryRecord = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
};

export async function listExpenseCategories(): Promise<CategoryRecord[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  let query = supabase
    .from("categories")
    .select("id,name,kind")
    .eq("kind", "expense")
    .order("name", { ascending: true });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Без названия"),
    kind: String(row.kind ?? "expense") as CategoryRecord["kind"],
  }));
}
