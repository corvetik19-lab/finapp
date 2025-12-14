import { NextResponse } from "next/server";
import { processPaymentReminders } from "@/lib/investors/notifications";

// Vercel Cron: запускается ежедневно в 9:00 UTC
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Проверяем авторизацию для cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPaymentReminders();
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      reminders: result.reminders,
      overdueAlerts: result.overdueAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Investment reminders cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
