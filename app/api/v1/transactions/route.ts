import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  validateAPIKey,
  checkRateLimit,
  logAPIUsage,
  hasScope,
} from "@/lib/api/auth";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/v1/transactions - Получить транзакции
 * Query params:
 * - limit: количество (default: 50, max: 100)
 * - offset: смещение (default: 0)
 * - from: дата начала (YYYY-MM-DD)
 * - to: дата конца (YYYY-MM-DD)
 * - direction: income | expense | transfer
 * - account_id: фильтр по счёту
 * - category_id: фильтр по категории
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  // Аутентификация
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key" },
      { status: 401 }
    );
  }

  const validation = await validateAPIKey(apiKey);
  if (!validation.valid || !validation.userId || !validation.keyData) {
    return NextResponse.json(
      { error: validation.error || "Unauthorized" },
      { status: 401 }
    );
  }

  // Проверка scope
  if (!hasScope(validation.keyData, "read")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Проверка rate limit
  const rateCheck = await checkRateLimit(
    validation.keyData.id,
    validation.keyData.rate_limit
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": validation.keyData.rate_limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const supabase = getServiceClient();
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50"),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const direction = searchParams.get("direction");
    const accountId = searchParams.get("account_id");
    const categoryId = searchParams.get("category_id");

    let query = supabase
      .from("transactions")
      .select(
        `
        *,
        accounts(id, name, type, currency),
        categories(id, name, type, icon)
      `
      )
      .eq("user_id", validation.userId)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (direction) query = query.eq("direction", direction);
    if (accountId) query = query.eq("account_id", accountId);
    if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error, count } = await query;

    if (error) throw error;

    const responseTime = Date.now() - startTime;

    // Логирование
    await logAPIUsage({
      apiKeyId: validation.keyData.id,
      userId: validation.userId,
      endpoint: "/api/v1/transactions",
      method: "GET",
      statusCode: 200,
      responseTimeMs: responseTime,
    });

    return NextResponse.json(
      {
        data,
        meta: {
          total: count,
          limit,
          offset,
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": validation.keyData.rate_limit.toString(),
          "X-RateLimit-Remaining": rateCheck.remaining.toString(),
          "X-Response-Time": `${responseTime}ms`,
        },
      }
    );
  } catch {
    const responseTime = Date.now() - startTime;
    
    await logAPIUsage({
      apiKeyId: validation.keyData.id,
      userId: validation.userId,
      endpoint: "/api/v1/transactions",
      method: "GET",
      statusCode: 500,
      responseTimeMs: responseTime,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/transactions - Создать транзакцию
 * Body:
 * {
 *   amount: number (в копейках),
 *   direction: "income" | "expense" | "transfer",
 *   account_id: string,
 *   category_id: string,
 *   date: string (YYYY-MM-DD),
 *   description?: string,
 *   tags?: string[]
 * }
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const validation = await validateAPIKey(apiKey);
  if (!validation.valid || !validation.userId || !validation.keyData) {
    return NextResponse.json(
      { error: validation.error || "Unauthorized" },
      { status: 401 }
    );
  }

  if (!hasScope(validation.keyData, "write")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const rateCheck = await checkRateLimit(
    validation.keyData.id,
    validation.keyData.rate_limit
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        ...body,
        user_id: validation.userId,
      })
      .select()
      .single();

    if (error) throw error;

    const responseTime = Date.now() - startTime;

    await logAPIUsage({
      apiKeyId: validation.keyData.id,
      userId: validation.userId,
      endpoint: "/api/v1/transactions",
      method: "POST",
      statusCode: 201,
      responseTimeMs: responseTime,
    });

    return NextResponse.json(
      { data },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": validation.keyData.rate_limit.toString(),
          "X-RateLimit-Remaining": rateCheck.remaining.toString(),
          "X-Response-Time": `${responseTime}ms`,
        },
      }
    );
  } catch {
    const responseTime = Date.now() - startTime;
    
    await logAPIUsage({
      apiKeyId: validation.keyData.id,
      userId: validation.userId,
      endpoint: "/api/v1/transactions",
      method: "POST",
      statusCode: 400,
      responseTimeMs: responseTime,
    });

    return NextResponse.json(
      { error: "Bad request" },
      { status: 400 }
    );
  }
}
