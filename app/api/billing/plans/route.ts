import { NextResponse } from "next/server";
import { getSubscriptionPlans } from "@/lib/billing/subscription-service";

// GET /api/billing/plans - получить список тарифов
export async function GET() {
  try {
    const plans = await getSubscriptionPlans(true);
    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/billing/plans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
