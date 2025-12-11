import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteClient } from "@/lib/supabase/helpers";
import { listTransactionsForSelectRoute } from "@/lib/transactions/service";

const querySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .optional(),
  limit: z
    .string()
    .transform((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : NaN;
    })
    .pipe(z.number().int().min(1).max(50))
    .optional(),
  ids: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.split(",").map((id) => id.trim()).filter(Boolean) : undefined)),
  excludeLinked: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  fromDate: z
    .string()
    .trim()
    .optional(),
  toDate: z
    .string()
    .trim()
    .optional(),
  categoryId: z
    .string()
    .uuid()
    .optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Некорректные параметры",
        },
        { status: 400 }
      );
    }

    const { search, limit, ids, excludeLinked, fromDate, toDate, categoryId } = parsed.data;

    const supabase = await createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const items = await listTransactionsForSelectRoute({
      search,
      limit,
      ids,
      excludeLinked,
      fromDate,
      toDate,
      categoryId,
    });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось получить транзакции";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
