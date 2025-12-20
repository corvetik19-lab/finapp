import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { createSubscription } from "@/lib/billing/subscription-service";

// POST /api/billing/subscriptions - создать подписку
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем что пользователь super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    if (profile?.global_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { organization_id, plan_id, billing_period, users_count, discount_percent, trial_days, notes } = body;

    if (!organization_id || !plan_id || !billing_period) {
      return NextResponse.json(
        { error: "organization_id, plan_id, and billing_period are required" },
        { status: 400 }
      );
    }

    const subscription = await createSubscription({
      organization_id,
      plan_id,
      billing_period,
      users_count: users_count || 1,
      discount_percent: discount_percent || 0,
      trial_days: trial_days || 0,
      notes,
    });

    if (!subscription) {
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 400 });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("POST /api/billing/subscriptions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
