import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import {
  sendBudgetAlertEmail,
  sendLargeTransactionEmail,
  sendWeeklySummaryEmail,
  sendTestEmail,
} from "@/lib/email/resend-service";

export const dynamic = "force-dynamic";

/**
 * POST - Отправка email уведомления
 */
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
    const { type, ...params } = body;

    // Получаем email пользователя
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "budget_alert":
        result = await sendBudgetAlertEmail({
          to: userEmail,
          ...params,
        });
        break;

      case "large_transaction":
        result = await sendLargeTransactionEmail({
          to: userEmail,
          ...params,
        });
        break;

      case "weekly_summary":
        result = await sendWeeklySummaryEmail({
          to: userEmail,
          ...params,
        });
        break;

      case "test":
        result = await sendTestEmail(userEmail);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      id: result.id,
    });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
