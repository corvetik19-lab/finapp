import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    await params; // boardId not used directly but validates route
    const supabase = await createRouteClient();
    const body = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the max position in the column
    const { data: existingCards } = await supabase
      .from("kanban_cards")
      .select("position")
      .eq("column_id", body.column_id)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = existingCards && existingCards.length > 0
      ? existingCards[0].position + 1
      : 0;

    const { data: card, error } = await supabase
      .from("kanban_cards")
      .insert({
        column_id: body.column_id,
        title: body.title,
        description: body.description || null,
        priority: body.priority || "normal",
        due_date: body.due_date || null,
        due_time: body.due_time || null,
        estimated_hours: body.estimated_hours || null,
        labels: body.labels || [],
        assignee_ids: body.assignee_ids || [],
        tender_id: body.tender_id || null,
        position: nextPosition,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(card);
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
