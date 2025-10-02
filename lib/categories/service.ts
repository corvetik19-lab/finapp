import { createRSCClient } from "@/lib/supabase/helpers";

export type CategoryRecord = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
};

export async function listExpenseCategories(): Promise<CategoryRecord[]> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,kind")
    .eq("kind", "expense")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Без названия"),
    kind: String(row.kind ?? "expense") as CategoryRecord["kind"],
  }));
}
