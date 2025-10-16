import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { detectSpendingAnomalies } from "@/lib/ai/anomaly-detector";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/anomaly-detector
 * 
 * Анализирует траты пользователя и возвращает предупреждения о рисках
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await detectSpendingAnomalies(supabase, user.id);

    return NextResponse.json({
      report,
      has_alerts: report.alerts.length > 0,
      alert_count: report.alerts.length,
      critical_count: report.alerts.filter((a) => a.severity === "critical").length,
      high_count: report.alerts.filter((a) => a.severity === "high").length,
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при анализе трат",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
