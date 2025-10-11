import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { generateAPIKey } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/**
 * GET - получить список API ключей пользователя
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ keys: data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - создать новый API ключ
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes = ["read"], rate_limit = 1000, expires_in_days } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { key, hash, prefix } = generateAPIKey();

    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        name,
        key_hash: hash,
        key_prefix: prefix,
        scopes,
        rate_limit,
        expires_at,
      })
      .select()
      .single();

    return NextResponse.json({
      key,
      data: {
        id: data.id,
        name: data.name,
        key_prefix: data.key_prefix,
        scopes: data.scopes,
        rate_limit: data.rate_limit,
        expires_at: data.expires_at,
      },
      warning: "Save this key securely. You won't be able to see it again.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - удалить API ключ
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keyId = request.url.split("/").pop();
    if (!keyId) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);


    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
