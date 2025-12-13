import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const supabase = await createRouteClient();

    const { data: card, error } = await supabase
      .from("kanban_cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (error) throw error;

    return NextResponse.json(card);
  } catch (error) {
    console.error("Error fetching card:", error);
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const supabase = await createRouteClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.due_time !== undefined) updateData.due_time = body.due_time;
    if (body.estimated_hours !== undefined) updateData.estimated_hours = body.estimated_hours;
    if (body.spent_hours !== undefined) updateData.spent_hours = body.spent_hours;
    if (body.labels !== undefined) updateData.labels = body.labels;
    if (body.assignee_ids !== undefined) updateData.assignee_ids = body.assignee_ids;
    if (body.checklist !== undefined) updateData.checklist = body.checklist;
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;

    const { data: card, error } = await supabase
      .from("kanban_cards")
      .update(updateData)
      .eq("id", cardId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(card);
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from("kanban_cards")
      .delete()
      .eq("id", cardId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
