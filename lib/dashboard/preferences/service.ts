import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";
import {
  CATEGORY_WIDGET_KEY,
  PRODUCT_WIDGET_KEY,
  WIDGET_VISIBILITY_KEY,
  normalizeWidgetVisibleIds,
  normalizeHiddenWidgets,
  type CategoryWidgetPreferencesState,
  type ProductWidgetPreferencesState,
  type WidgetVisibilityState,
  type DashboardWidgetKey,
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

// Загрузка настроек видимости виджетов
const DEFAULT_WIDGET_VISIBILITY: WidgetVisibilityState = { hidden: [] };

export async function loadWidgetVisibility(): Promise<WidgetVisibilityState> {
  const supabase = await createRSCClient();

  try {
    const { data, error } = await supabase
      .from("dashboard_widget_preferences")
      .select("state")
      .eq("widget", WIDGET_VISIBILITY_KEY)
      .maybeSingle();

    if (error) {
      logger.warn("loadWidgetVisibility error", { error });
      return DEFAULT_WIDGET_VISIBILITY;
    }

    const rawState = (data?.state ?? {}) as Record<string, unknown>;
    const hidden = normalizeHiddenWidgets(rawState.hidden);

    return { hidden };
  } catch (unknownError) {
    logger.error("loadWidgetVisibility unexpected", { error: unknownError });
    return DEFAULT_WIDGET_VISIBILITY;
  }
}

// Сохранение настроек видимости виджетов
export async function saveWidgetVisibility(
  state: WidgetVisibilityState
): Promise<void> {
  const supabase = await createRouteClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.warn("saveWidgetVisibility auth", { error: userError });
      return;
    }

    if (!user) {
      logger.warn("saveWidgetVisibility no user");
      return;
    }

    const payload = {
      user_id: user.id,
      widget: WIDGET_VISIBILITY_KEY,
      state: {
        hidden: normalizeHiddenWidgets(state.hidden),
      },
    };

    const { error } = await supabase
      .from("dashboard_widget_preferences")
      .upsert(payload, { onConflict: "user_id,widget" });

    if (error) {
      logger.warn("saveWidgetVisibility upsert", { error });
    }
  } catch (unknownError) {
    logger.error("saveWidgetVisibility unexpected", { error: unknownError });
  }
}

// Утилита для проверки видимости виджета
export function isWidgetVisible(
  widgetKey: DashboardWidgetKey,
  visibility: WidgetVisibilityState
): boolean {
  return !visibility.hidden.includes(widgetKey);
}

// Настройки виджета товаров
const DEFAULT_PRODUCT_PREFERENCES: ProductWidgetPreferencesState = { visibleProducts: [] };

export async function loadProductWidgetPreferences(): Promise<ProductWidgetPreferencesState> {
  const supabase = await createRSCClient();

  try {
    const { data, error } = await supabase
      .from("dashboard_widget_preferences")
      .select("state")
      .eq("widget", PRODUCT_WIDGET_KEY)
      .maybeSingle();

    if (error) {
      logger.warn("loadProductWidgetPreferences error", { error });
      return DEFAULT_PRODUCT_PREFERENCES;
    }

    const rawState = (data?.state ?? {}) as Record<string, unknown>;
    const visibleProducts = normalizeWidgetVisibleIds(rawState.visibleProducts);

    return { visibleProducts };
  } catch (unknownError) {
    logger.error("loadProductWidgetPreferences unexpected", { error: unknownError });
    return DEFAULT_PRODUCT_PREFERENCES;
  }
}

export async function saveProductWidgetPreferences(
  state: ProductWidgetPreferencesState
): Promise<void> {
  const supabase = await createRouteClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.warn("saveProductWidgetPreferences auth", { error: userError });
      return;
    }

    if (!user) {
      logger.warn("saveProductWidgetPreferences no user");
      return;
    }

    const payload = {
      user_id: user.id,
      widget: PRODUCT_WIDGET_KEY,
      state: {
        visibleProducts: normalizeWidgetVisibleIds(state.visibleProducts),
      },
    };

    const { error } = await supabase
      .from("dashboard_widget_preferences")
      .upsert(payload, { onConflict: "user_id,widget" });

    if (error) {
      logger.warn("saveProductWidgetPreferences upsert", { error });
    }
  } catch (unknownError) {
    logger.error("saveProductWidgetPreferences unexpected", { error: unknownError });
  }
}
