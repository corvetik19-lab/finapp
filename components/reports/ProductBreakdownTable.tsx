"use client";

import { formatMoney } from "@/lib/utils/format";
import styles from "./Reports.module.css";

type ProductBreakdownTableProps = {
  labels: string[];
  values: number[];
  quantities: number[];
  units: string[];
  currency: string;
};

export default function ProductBreakdownTable({
  labels,
  values,
  quantities,
  units,
  currency,
}: ProductBreakdownTableProps) {
  if (labels.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>Нет данных по товарам</strong>
        <span>
          Добавьте позиции товаров в транзакции, чтобы увидеть аналитику.
        </span>
      </div>
    );
  }

  const total = values.reduce((sum, val) => sum + val, 0);

  return (
    <div className={styles.productTable}>
      <table>
        <thead>
          <tr>
            <th>Товар</th>
            <th>Количество</th>
            <th>Сумма</th>
            <th>% от общего</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => {
            const value = values[index];
            const quantity = quantities[index];
            const unit = units[index];
            const percentage = total > 0 ? (value / total) * 100 : 0;

            return (
              <tr key={label}>
                <td className={styles.productName}>{label}</td>
                <td className={styles.productQuantity}>
                  {quantity.toFixed(2)} {unit}
                </td>
                <td className={styles.productAmount}>
                  {formatMoney(Math.round(value * 100), currency)}
                </td>
                <td className={styles.productPercentage}>
                  {percentage.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>
              <strong>Итого</strong>
            </td>
            <td className={styles.productAmount}>
              <strong>{formatMoney(Math.round(total * 100), currency)}</strong>
            </td>
            <td className={styles.productPercentage}>
              <strong>100%</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
