'use server';
import { logger } from "@/lib/logger";

import { revalidatePath } from "next/cache";

import { createRouteClient } from "@/lib/supabase/helpers";
import {
  upcomingPaymentFormSchema,
  type UpcomingPaymentFormInput,
} from "@/lib/dashboard/upcoming-payments/schema";

export type SaveUpcomingPaymentActionResult = { success: true } | { success: false; error: string };

export async function saveUpcomingPaymentAction(
  input: UpcomingPaymentFormInput
): Promise<SaveUpcomingPaymentActionResult> {
  const parsed = upcomingPaymentFormSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return { success: false, error: message };
  }

  const { id, name, dueDate, amountMajor, direction, accountName } = parsed.data;
  const amountMinor = Math.round(amountMajor * 100);

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

    const payload = {
      name,
      due_date: dueDate,
      amount_minor: amountMinor,
      direction,
      account_name: accountName ?? null,
    };

    logger.info("saveUpcomingPaymentAction payload", {
      id,
      payload,
      user: user.id,
    });

    const fullPayload = { ...payload, user_id: user.id };

    if (id) {
      const { data, error } = await supabase
        .from("upcoming_payments")
        .update(fullPayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select();

      if (error) {
        logger.warn("saveUpcomingPaymentAction update", { error, code: error.code, details: error.details });
        return { success: false, error: `Update error: ${error.message}` };
      }
      logger.info("saveUpcomingPaymentAction update success", { data });
    } else {
      const { data, error } = await supabase
        .from("upcoming_payments")
        .insert(fullPayload)
        .select();

      if (error) {
        logger.warn("saveUpcomingPaymentAction insert", { error, code: error.code, details: error.details });
        return { success: false, error: `Insert error: ${error.message}` };
      }
      logger.info("saveUpcomingPaymentAction insert success", { data });
    }

    logger.info("saveUpcomingPaymentAction success", { id, direction, amountMinor });

    revalidatePath("/finance/dashboard");
    return { success: true };
  } catch (error) {
    logger.error("saveUpcomingPaymentAction", { error });
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message ?? "Не удалось сохранить платёж")
        : "Не удалось сохранить платёж";
    return { success: false, error: message };
  }
}

export type DeleteUpcomingPaymentActionResult = { success: true } | { success: false; error: string };

export async function deleteUpcomingPaymentAction(id: string): Promise<DeleteUpcomingPaymentActionResult> {
  if (!id) {
    return { success: false, error: "Не указан платёж" };
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
      .from("upcoming_payments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/finance/dashboard");
    return { success: true };
  } catch (error) {
    console.error("deleteUpcomingPaymentAction", error);
    return { success: false, error: "Не удалось удалить платёж" };
  }
}
