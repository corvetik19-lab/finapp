import type { TransactionItemInput } from "@/types/transaction";

/**
 * Рассчитать общую сумму из позиций товаров (в копейках)
 */
export function calculateTotalFromItems(items: TransactionItemInput[]): number {
  return items.reduce((sum, item) => {
    return sum + Math.round(item.quantity * item.price_per_unit);
  }, 0);
}
