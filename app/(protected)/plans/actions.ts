"use server";

import { z } from "zod";

import { listPlansForSelectRoute } from "@/lib/plans/service";
import type { PlanSelectItem } from "@/lib/plans/service";

const planSelectParamsSchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    ids: z.array(z.string().uuid()).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .partial();

export async function fetchPlansForSelectAction(raw: unknown = {}): Promise<PlanSelectItem[]> {
  const parsed = planSelectParamsSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Некорректные параметры выбора планов");
  }

  const payload = parsed.data;

  return listPlansForSelectRoute({
    ...payload,
    search: payload.search?.trim() || undefined,
  });
}
