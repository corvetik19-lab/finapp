"use server";

import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logActivity } from "./tasks-service";
import { SupplierReview } from "./types";

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await getCachedUser();
  return user?.id || null;
}

export interface CreateReviewInput {
  supplier_id: string;
  quality_rating?: number;
  delivery_rating?: number;
  price_rating?: number;
  communication_rating?: number;
  comment?: string;
  related_tender_id?: string;
}

// Получить отзывы по поставщику
export async function getSupplierReviews(
  supplierId: string
): Promise<SupplierReview[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_reviews")
    .select("*")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching supplier reviews:", error);
    return [];
  }

  return (data || []) as SupplierReview[];
}

// Создать отзыв
export async function createReview(
  input: CreateReviewInput
): Promise<{ success: boolean; review?: SupplierReview; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  // Вычисляем общий рейтинг
  const ratings = [
    input.quality_rating,
    input.delivery_rating,
    input.price_rating,
    input.communication_rating,
  ].filter((r): r is number => r !== undefined && r !== null);

  const overallRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  const { data, error } = await supabase
    .from("supplier_reviews")
    .insert({
      company_id: companyId,
      supplier_id: input.supplier_id,
      quality_rating: input.quality_rating,
      delivery_rating: input.delivery_rating,
      price_rating: input.price_rating,
      communication_rating: input.communication_rating,
      overall_rating: overallRating,
      comment: input.comment,
      related_tender_id: input.related_tender_id,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating review:", error);
    return { success: false, error: "Ошибка создания отзыва" };
  }

  // Логируем активность
  await logActivity(
    input.supplier_id,
    "rating_changed",
    `Добавлен отзыв (рейтинг: ${overallRating})`,
    { review_id: data.id }
  );

  return { success: true, review: data as SupplierReview };
}

// Обновить отзыв
export async function updateReview(
  reviewId: string,
  input: Partial<CreateReviewInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  // Вычисляем новый общий рейтинг если изменились оценки
  let overallRating: number | undefined;
  if (input.quality_rating || input.delivery_rating || input.price_rating || input.communication_rating) {
    const ratings = [
      input.quality_rating,
      input.delivery_rating,
      input.price_rating,
      input.communication_rating,
    ].filter((r): r is number => r !== undefined && r !== null);

    if (ratings.length > 0) {
      overallRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
    }
  }

  const updateData: Record<string, unknown> = { ...input };
  if (overallRating !== undefined) {
    updateData.overall_rating = overallRating;
  }

  const { error } = await supabase
    .from("supplier_reviews")
    .update(updateData)
    .eq("id", reviewId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error updating review:", error);
    return { success: false, error: "Ошибка обновления отзыва" };
  }

  return { success: true };
}

// Удалить отзыв
export async function deleteReview(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Ошибка удаления отзыва" };
  }

  return { success: true };
}

// Получить агрегированную статистику рейтингов
export async function getSupplierRatingStats(
  supplierId: string
): Promise<{
  avgQuality: number;
  avgDelivery: number;
  avgPrice: number;
  avgCommunication: number;
  avgOverall: number;
  totalReviews: number;
} | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: reviews } = await supabase
    .from("supplier_reviews")
    .select("quality_rating, delivery_rating, price_rating, communication_rating, overall_rating")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId);

  if (!reviews || reviews.length === 0) return null;

  const avgOf = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : 0;
  };

  return {
    avgQuality: avgOf(reviews.map((r) => r.quality_rating)),
    avgDelivery: avgOf(reviews.map((r) => r.delivery_rating)),
    avgPrice: avgOf(reviews.map((r) => r.price_rating)),
    avgCommunication: avgOf(reviews.map((r) => r.communication_rating)),
    avgOverall: avgOf(reviews.map((r) => r.overall_rating)),
    totalReviews: reviews.length,
  };
}
