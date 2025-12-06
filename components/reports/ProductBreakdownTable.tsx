"use client";

import { formatMoney } from "@/lib/utils/format";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      <div className="text-center py-8">
        <p className="font-semibold">Нет данных по товарам</p>
        <p className="text-sm text-muted-foreground">Добавьте позиции товаров в транзакции.</p>
      </div>
    );
  }

  const total = values.reduce((sum, val) => sum + val, 0);

  return (
    <Table>
      <TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Количество</TableHead><TableHead className="text-right">Сумма</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
      <TableBody>
        {labels.map((label, index) => {
          const value = values[index];
          const quantity = quantities[index];
          const unit = units[index];
          const percentage = total > 0 ? (value / total) * 100 : 0;
          return (
            <TableRow key={label}>
              <TableCell className="font-medium">{label}</TableCell>
              <TableCell>{quantity.toFixed(2)} {unit}</TableCell>
              <TableCell className="text-right">{formatMoney(Math.round(value * 100), currency)}</TableCell>
              <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter><TableRow><TableCell colSpan={2}>Итого</TableCell><TableCell className="text-right font-bold">{formatMoney(Math.round(total * 100), currency)}</TableCell><TableCell className="text-right font-bold">100%</TableCell></TableRow></TableFooter>
    </Table>
  );
}
