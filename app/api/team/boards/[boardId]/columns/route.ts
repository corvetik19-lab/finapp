import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createRouteClient();

    const { data: columns, error } = await supabase
      .from("kanban_columns")
      .select("*")
      .eq("board_id", boardId)
      .order("position", { ascending: true });

    if (error) throw error;

    return NextResponse.json(columns);
  } catch (error) {
    console.error("Error fetching columns:", error);
    return NextResponse.json({ error: "Failed to fetch columns" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createRouteClient();
    const body = await request.json();

    // Get the max position
    const { data: existingColumns } = await supabase
      .from("kanban_columns")
      .select("position")
      .eq("board_id", boardId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = existingColumns && existingColumns.length > 0
      ? existingColumns[0].position + 1
      : 0;

    const { data: column, error } = await supabase
      .from("kanban_columns")
      .insert({
        board_id: boardId,
        name: body.name,
        color: body.color || "#6366f1",
        position: nextPosition,
        wip_limit: body.wip_limit || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(column);
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
  }
}
