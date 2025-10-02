import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";
import {
  CATEGORY_WIDGET_KEY,
  normalizeWidgetVisibleIds,
  type CategoryWidgetPreferencesState,
} from "./shared";

const DEFAULT_PREFERENCES: CategoryWidgetPreferencesState = { visibleIds: [] };

export async function loadCategoryWidgetPreferences(): Promise<CategoryWidgetPreferencesState> {
  const supabase = await createRSCClient();

  try {
    const { data, error } = await supabase
      .from("dashboard_widget_preferences")
      .select("state")
      .eq("widget", CATEGORY_WIDGET_KEY)
      .maybeSingle();

    if (error) {
      // таблица может отсутствовать в dev-среде или пользователь не авторизован
      logger.warn("loadCategoryWidgetPreferences error", { error });
      return DEFAULT_PREFERENCES;
    }

    const rawState = (data?.state ?? {}) as Record<string, unknown>;
    const visibleIds = normalizeWidgetVisibleIds(rawState.visibleIds);

    return { visibleIds };
  } catch (unknownError) {
    logger.error("loadCategoryWidgetPreferences unexpected", { error: unknownError });
    return DEFAULT_PREFERENCES;
  }
}

export async function saveCategoryWidgetPreferences(
  state: CategoryWidgetPreferencesState
): Promise<void> {
  const supabase = await createRouteClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.warn("saveCategoryWidgetPreferences auth", { error: userError });
      return;
    }

    if (!user) {
      logger.warn("saveCategoryWidgetPreferences no user");
      return;
    }

    const payload = {
      user_id: user.id,
      widget: CATEGORY_WIDGET_KEY,
      state: {
        visibleIds: normalizeWidgetVisibleIds(state.visibleIds),
      },
    };

    const { error } = await supabase
      .from("dashboard_widget_preferences")
      .upsert(payload, { onConflict: "user_id,widget" });

    if (error) {
      logger.warn("saveCategoryWidgetPreferences upsert", { error });
    }
  } catch (unknownError) {
    logger.error("saveCategoryWidgetPreferences unexpected", { error: unknownError });
  }
}
