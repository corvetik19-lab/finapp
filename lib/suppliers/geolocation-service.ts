"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

export interface SupplierLocation {
  id: string;
  name: string;
  actual_address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

// Получить поставщиков с координатами
export async function getSuppliersWithLocation(): Promise<SupplierLocation[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, actual_address, city, latitude, longitude, geocoded_at")
    .eq("company_id", companyId)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("name");

  if (error) {
    logger.error("Error fetching suppliers with location:", error);
    return [];
  }

  return (data || []) as SupplierLocation[];
}

// Получить всех поставщиков (для геокодирования)
export async function getSuppliersForGeocoding(): Promise<SupplierLocation[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, actual_address, city, latitude, longitude, geocoded_at")
    .eq("company_id", companyId)
    .or("actual_address.not.is.null,city.not.is.null")
    .order("name");

  if (error) {
    logger.error("Error fetching suppliers for geocoding:", error);
    return [];
  }

  return (data || []) as SupplierLocation[];
}

// Обновить координаты поставщика
export async function updateSupplierCoordinates(
  supplierId: string,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("suppliers")
    .update({
      latitude,
      longitude,
      geocoded_at: new Date().toISOString(),
    })
    .eq("id", supplierId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating supplier coordinates:", error);
    return { success: false, error: "Ошибка обновления координат" };
  }

  return { success: true };
}

// Очистить координаты поставщика
export async function clearSupplierCoordinates(
  supplierId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("suppliers")
    .update({
      latitude: null,
      longitude: null,
      geocoded_at: null,
    })
    .eq("id", supplierId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error clearing supplier coordinates:", error);
    return { success: false, error: "Ошибка очистки координат" };
  }

  return { success: true };
}

// Рассчитать расстояние между двумя точками (формула Haversine)
// Не экспортируем как server action - это чистая функция
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Радиус Земли в км
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Найти поставщиков в радиусе от точки
export async function findSuppliersInRadius(
  centerLat: number,
  centerLon: number,
  radiusKm: number
): Promise<(SupplierLocation & { distance: number })[]> {
  const suppliers = await getSuppliersWithLocation();

  return suppliers
    .map((s) => ({
      ...s,
      distance: calculateDistance(centerLat, centerLon, s.latitude!, s.longitude!),
    }))
    .filter((s) => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Получить статистику геокодирования
export async function getGeocodingStats(): Promise<{
  total: number;
  geocoded: number;
  pending: number;
  percentage: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { total: 0, geocoded: 0, pending: 0, percentage: 0 };
  }

  const { count: total } = await supabase
    .from("suppliers")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: geocoded } = await supabase
    .from("suppliers")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("latitude", "is", null);

  const totalCount = total || 0;
  const geocodedCount = geocoded || 0;

  return {
    total: totalCount,
    geocoded: geocodedCount,
    pending: totalCount - geocodedCount,
    percentage: totalCount > 0 ? Math.round((geocodedCount / totalCount) * 100) : 0,
  };
}
