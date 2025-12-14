import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { processWebhookEvent } from "@/lib/suppliers/mango-service";
import { MangoWebhookEvent } from "@/lib/suppliers/types";

// POST /api/telephony/mango/webhook
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const vpbxApiKey = formData.get("vpbx_api_key") as string;
    const sign = formData.get("sign") as string;
    const json = formData.get("json") as string;

    if (!vpbxApiKey || !sign || !json) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Создаём клиент Supabase с service role для доступа к настройкам
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ищем компанию по API ключу
    const { data: settings, error } = await supabase
      .from("mango_settings")
      .select("company_id, api_key, api_salt")
      .eq("api_key", vpbxApiKey)
      .single();

    if (error || !settings) {
      console.error("Mango webhook: Unknown API key", vpbxApiKey);
      return NextResponse.json(
        { error: "Unknown API key" },
        { status: 401 }
      );
    }

    // Проверяем подпись
    const expectedSign = crypto
      .createHash("sha256")
      .update(settings.api_key + json + settings.api_salt)
      .digest("hex");

    if (sign !== expectedSign) {
      console.error("Mango webhook: Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Парсим событие
    const event: MangoWebhookEvent = JSON.parse(json);

    console.log("Mango webhook event:", {
      call_id: event.call_id,
      call_state: event.call_state,
      from: event.from.number,
      to: event.to.number,
    });

    // Обрабатываем событие
    await processWebhookEvent(event, settings.company_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mango webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
