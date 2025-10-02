"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createRouteClient } from "@/lib/supabase/helpers";
import { getBudgetWithUsage } from "@/lib/budgets/service";
import type { BudgetWithUsage } from "@/lib/budgets/service";
import { loadDashboardOverview } from "@/lib/dashboard/service";
import {
  loadCategorySummary,
  loadCategoryTransactions,
  type CategorySummaryParams,
  type CategorySummaryResult,
  type CategoryTransactionsParams,
  type CategoryTransactionItem,
} from "@/lib/dashboard/category-management";
import { saveCategoryWidgetPreferences } from "@/lib/dashboard/preferences/service";
import type { CategoryWidgetPreferencesState } from "@/lib/dashboard/preferences/shared";

const payloadSchema = z
  .object({
    categoryId: z.string().min(1, "Выберите категорию"),
    limitMajor: z.number().positive("Лимит должен быть больше нуля"),
    currency: z.string().min(1, "Укажите валюту"),
    periodStart: z.string().min(1, "Укажите дату начала"),
    periodEnd: z.string().min(1, "Укажите дату окончания"),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        path: ["periodStart"],
        code: z.ZodIssueCode.custom,
        message: "Некорректная дата начала",
      });
    }

    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        path: ["periodEnd"],
        code: z.ZodIssueCode.custom,
        message: "Некорректная дата окончания",
      });
    }

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      ctx.addIssue({
        path: ["periodEnd"],
        code: z.ZodIssueCode.custom,
        message: "Дата окончания должна быть позже даты начала",
      });
    }
  });

export type CreateBudgetInput = z.infer<typeof payloadSchema>;

export type CreateBudgetResult =
  | { success: true; budget: BudgetWithUsage }
  | { success: false; error: string };

export async function createBudgetAction(input: CreateBudgetInput): Promise<CreateBudgetResult> {
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const { categoryId, limitMajor, currency, periodStart, periodEnd } = parsed.data;
  const limitMinor = Math.round(limitMajor * 100);

  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return { success: false, error: "Необходима авторизация" };
    }

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        category_id: categoryId,
        limit_amount: limitMinor,
        currency,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const budgetId = String(data.id);
    const budget = await getBudgetWithUsage(budgetId);

    revalidatePath("/dashboard");

    if (!budget) {
      return { success: false, error: "Не удалось получить созданный бюджет" };
    }

    return { success: true, budget };
  } catch (error) {
    console.error("createBudgetAction", error);
    return { success: false, error: "Не удалось создать бюджет" };
  }
}

export type LoadTrendsResult =
  | { success: true; data: { labels: string[]; income: number[]; expense: number[] } }
  | { success: false; error: string };

type TrendsRequest =
  | { type: "months"; months: number }
  | { type: "range"; from: string; to: string };

export async function loadTrendsAction(request: TrendsRequest): Promise<LoadTrendsResult> {
  try {
    let overview;
    if (request.type === "months") {
      const monthsBack = Number.isFinite(request.months)
        ? Math.max(1, Math.min(36, Math.trunc(request.months)))
        : 12;
      overview = await loadDashboardOverview(monthsBack);
    } else {
      overview = await loadDashboardOverview(12, { from: request.from, to: request.to });
    }

    const trend = overview.trend;
    return {
      success: true,
      data: {
        labels: trend.map((point) => point.label),
        income: trend.map((point) => point.income),
        expense: trend.map((point) => point.expense),
      },
    };
  } catch (error) {
    console.error("loadTrendsAction", error);
    return { success: false, error: "Не удалось загрузить данные" };
  }
}

export type LoadExpenseBreakdownResult =
  | {
      success: true;
      data: {
        breakdown: ReturnType<typeof loadDashboardOverview> extends Promise<infer R>
          ? R extends { breakdown: infer B }
            ? B
            : never
          : never;
        total: number;
        range: { from: string; to: string };
        currency: string;
      };
    }
  | { success: false; error: string };

type BreakdownRequest = TrendsRequest;

export async function loadExpenseBreakdownAction(request: BreakdownRequest): Promise<LoadExpenseBreakdownResult> {
  try {
    let overview;
    if (request.type === "months") {
      const monthsBack = Number.isFinite(request.months)
        ? Math.max(1, Math.min(36, Math.trunc(request.months)))
        : 12;
      overview = await loadDashboardOverview(monthsBack);
    } else {
      overview = await loadDashboardOverview(12, { from: request.from, to: request.to });
    }

    const total = overview.breakdown.reduce((sum, item) => sum + item.amount, 0);

    return {
      success: true,
      data: {
        breakdown: overview.breakdown,
        total,
        range: overview.range,
        currency: overview.currency,
      },
    };
  } catch (error) {
    console.error("loadExpenseBreakdownAction", error);
    return { success: false, error: "Не удалось загрузить данные" };
  }
}

export type DeleteBudgetResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteBudgetAction(id: string): Promise<DeleteBudgetResult> {
  if (!id) {
    return { success: false, error: "Не указан бюджет" };
  }

  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return { success: false, error: "Необходима авторизация" };
    }

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("deleteBudgetAction", error);
    return { success: false, error: "Не удалось удалить бюджет" };
  }
}

export type LoadCategorySummaryActionResult =
  | { success: true; data: CategorySummaryResult }
  | { success: false; error: string };

export async function loadCategorySummaryAction(
  params: CategorySummaryParams
): Promise<LoadCategorySummaryActionResult> {
  try {
    const data = await loadCategorySummary(params);
    return { success: true, data };
  } catch (error) {
    console.error("loadCategorySummaryAction", error);
    return { success: false, error: "Не удалось загрузить данные" };
  }
}

export type LoadCategoryTransactionsActionResult =
  | { success: true; data: CategoryTransactionItem[] }
  | { success: false; error: string };

export async function loadCategoryTransactionsAction(
  params: CategoryTransactionsParams
): Promise<LoadCategoryTransactionsActionResult> {
  try {
    if (!params.categoryId) {
      return { success: false, error: "Не указана категория" };
    }
    const data = await loadCategoryTransactions(params);
    return { success: true, data };
  } catch (error) {
    console.error("loadCategoryTransactionsAction", error);
    return { success: false, error: "Не удалось загрузить транзакции" };
  }
}

export type SaveCategoryWidgetPreferencesActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveCategoryWidgetPreferencesAction(
  state: CategoryWidgetPreferencesState
): Promise<SaveCategoryWidgetPreferencesActionResult> {
  try {
    await saveCategoryWidgetPreferences(state);
    return { success: true };
  } catch (error) {
    console.error("saveCategoryWidgetPreferencesAction", error);
    return { success: false, error: "Не удалось сохранить настройки" };
  }
}