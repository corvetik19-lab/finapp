import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - получить уведомления пользователя
export async function GET(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("smart_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyUnread) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - создать уведомление
export async function POST(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      message,
      severity = "info",
      category_id,
      related_entity_type,
      related_entity_id,
      action_url,
      metadata,
      expires_at,
    } = body;

    const { data, error } = await supabase
      .from("smart_notifications")
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        severity,
        category_id,
        related_entity_type,
        related_entity_id,
        action_url,
        metadata,
        expires_at,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification: data }, { status: 201 });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - обновить статус уведомления (прочитано/отклонено)
export async function PATCH(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, is_read, is_dismissed } = body;

    const updates: {
      is_read?: boolean;
      read_at?: string;
      is_dismissed?: boolean;
      dismissed_at?: string;
    } = {};

    if (typeof is_read === "boolean") {
      updates.is_read = is_read;
      if (is_read) {
        updates.read_at = new Date().toISOString();
      }
    }

    if (typeof is_dismissed === "boolean") {
      updates.is_dismissed = is_dismissed;
      if (is_dismissed) {
        updates.dismissed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("smart_notifications")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification: data });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - удалить уведомление
export async function DELETE(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("smart_notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
