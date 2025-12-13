import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const supabase = await createRouteClient();
    const body = await request.json();

    const { column_id: newColumnId, position: newPosition } = body;

    // Get current card info
    const { data: currentCard, error: cardError } = await supabase
      .from("kanban_cards")
      .select("column_id, position")
      .eq("id", cardId)
      .single();

    if (cardError || !currentCard) {
      throw new Error("Card not found");
    }

    const oldColumnId = currentCard.column_id;
    const oldPosition = currentCard.position;

    // If moving to same column
    if (oldColumnId === newColumnId) {
      if (oldPosition !== newPosition) {
        // Get all cards in the column
        const { data: cards } = await supabase
          .from("kanban_cards")
          .select("id, position")
          .eq("column_id", oldColumnId)
          .order("position", { ascending: true });

        if (cards) {
          for (const card of cards) {
            if (card.id === cardId) continue;

            let updatedPosition = card.position;
            if (oldPosition < newPosition) {
              // Moving down
              if (card.position > oldPosition && card.position <= newPosition) {
                updatedPosition = card.position - 1;
              }
            } else {
              // Moving up
              if (card.position >= newPosition && card.position < oldPosition) {
                updatedPosition = card.position + 1;
              }
            }

            if (updatedPosition !== card.position) {
              await supabase
                .from("kanban_cards")
                .update({ position: updatedPosition })
                .eq("id", card.id);
            }
          }
        }
      }
    } else {
      // Moving to different column
      // Decrease positions in old column for cards after the moved card
      const { data: oldColumnCards } = await supabase
        .from("kanban_cards")
        .select("id, position")
        .eq("column_id", oldColumnId)
        .gt("position", oldPosition);

      if (oldColumnCards) {
        for (const card of oldColumnCards) {
          await supabase
            .from("kanban_cards")
            .update({ position: card.position - 1 })
            .eq("id", card.id);
        }
      }

      // Increase positions in new column for cards at or after the new position
      const { data: newColumnCards } = await supabase
        .from("kanban_cards")
        .select("id, position")
        .eq("column_id", newColumnId)
        .gte("position", newPosition);

      if (newColumnCards) {
        for (const card of newColumnCards) {
          await supabase
            .from("kanban_cards")
            .update({ position: card.position + 1 })
            .eq("id", card.id);
        }
      }
    }

    // Update the moved card
    const { data: updatedCard, error: updateError } = await supabase
      .from("kanban_cards")
      .update({
        column_id: newColumnId,
        position: newPosition,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error("Error moving card:", error);
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 });
  }
}
