import type { Sprint, SprintItem } from "./types";

// Sprints
export async function getSprints(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  companyId: string
): Promise<Sprint[]> {
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSprint(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprintId: string
): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("id", sprintId)
    .single();

  if (error) throw error;
  return data;
}

export async function createSprint(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprint: Partial<Sprint>
): Promise<Sprint> {
  const { data, error } = await supabase
    .from("sprints")
    .insert(sprint)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSprint(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprintId: string,
  updates: Partial<Sprint>
): Promise<Sprint> {
  const { data, error } = await supabase
    .from("sprints")
    .update(updates)
    .eq("id", sprintId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSprint(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprintId: string
): Promise<void> {
  const { error } = await supabase
    .from("sprints")
    .delete()
    .eq("id", sprintId);

  if (error) throw error;
}

// Sprint Items
export async function getSprintItems(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprintId: string
): Promise<SprintItem[]> {
  const { data, error } = await supabase
    .from("sprint_items")
    .select("*")
    .eq("sprint_id", sprintId)
    .order("priority", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addItemToSprint(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprintId: string,
  itemType: "task" | "tender" | "card",
  itemId: string,
  storyPoints?: number
): Promise<SprintItem> {
  const { data, error } = await supabase
    .from("sprint_items")
    .insert({
      sprint_id: sprintId,
      item_type: itemType,
      item_id: itemId,
      story_points: storyPoints || 0,
      status: "todo",
      priority: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSprintItem(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  itemId: string,
  updates: Partial<SprintItem>
): Promise<SprintItem> {
  const { data, error } = await supabase
    .from("sprint_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeItemFromSprint(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from("sprint_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}

// Sprint Statistics
export async function getSprintStats(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  sprintId: string
): Promise<{
  totalItems: number;
  completedItems: number;
  totalPoints: number;
  completedPoints: number;
  velocity: number;
}> {
  const { data: items, error } = await supabase
    .from("sprint_items")
    .select("status, story_points")
    .eq("sprint_id", sprintId);

  if (error) throw error;

  const totalItems = items?.length || 0;
  const completedItems = items?.filter((t: { status: string }) => t.status === "done").length || 0;
  const totalPoints = items?.reduce((sum: number, t: { story_points: number | null }) => sum + (t.story_points || 0), 0) || 0;
  const completedPoints = items
    ?.filter((t: { status: string }) => t.status === "done")
    .reduce((sum: number, t: { story_points: number | null }) => sum + (t.story_points || 0), 0) || 0;

  return {
    totalItems,
    completedItems,
    totalPoints,
    completedPoints,
    velocity: completedPoints,
  };
}
