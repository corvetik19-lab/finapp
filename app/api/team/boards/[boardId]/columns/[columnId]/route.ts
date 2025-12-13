import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string }> }
) {
  try {
    const { boardId, columnId } = await params;
    const supabase = await createRouteClient();
    const body = await request.json();

    // If position is being updated, reorder other columns
    if (typeof body.position === "number") {
      const { data: columns } = await supabase
        .from("kanban_columns")
        .select("id, position")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      if (columns) {
        const currentCol = columns.find((c: { id: string; position: number }) => c.id === columnId);
        if (currentCol) {
          const oldPosition = currentCol.position;
          const newPosition = body.position;

          if (oldPosition !== newPosition) {
            // Update positions of affected columns
            for (const col of columns) {
              if (col.id === columnId) continue;

              let newPos = col.position;
              if (oldPosition < newPosition) {
                // Moving right
                if (col.position > oldPosition && col.position <= newPosition) {
                  newPos = col.position - 1;
                }
              } else {
                // Moving left
                if (col.position >= newPosition && col.position < oldPosition) {
                  newPos = col.position + 1;
                }
              }

              if (newPos !== col.position) {
                await supabase
                  .from("kanban_columns")
                  .update({ position: newPos })
                  .eq("id", col.id);
              }
            }
          }
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.wip_limit !== undefined) updateData.wip_limit = body.wip_limit;
    if (body.is_done_column !== undefined) updateData.is_done_column = body.is_done_column;

    const { data: column, error } = await supabase
      .from("kanban_columns")
      .update(updateData)
      .eq("id", columnId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(column);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json({ error: "Failed to update column" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string }> }
) {
  try {
    const { columnId } = await params;
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from("kanban_columns")
      .delete()
      .eq("id", columnId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json({ error: "Failed to delete column" }, { status: 500 });
  }
}
