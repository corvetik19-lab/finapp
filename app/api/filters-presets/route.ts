import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

export async function GET() {
  const supabase = await createRSCClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("filters_presets")
    .select("id,name,payload,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presets: data || [] });
}

export async function POST(req: Request) {
  const supabase = await createRSCClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body?.name || "").trim();
  const payload = body?.payload ?? {};
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const { data, error } = await supabase
    .from("filters_presets")
    .upsert(
      [{ user_id: user.id, name, payload }],
      { onConflict: "user_id,name" }
    )
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, preset: data?.[0] });
}

export async function DELETE(req: Request) {
  const supabase = await createRSCClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const { error } = await supabase
    .from("filters_presets")
    .delete()
    .eq("name", name);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
