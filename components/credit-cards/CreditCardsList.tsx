"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";

export type CreditCard = {
  id: string;
  bank: string;
  balance: number; // доступный остаток в минорных единицах
  limit: number;
  available: number;
  debt?: number; // задолженность в минорных единицах
  currency: string;
  interestRate: number;
  gracePeriod: number;
  nextPaymentDate: string | null;
  minPayment: number; // рассчитанный мин. платёж в минорных единицах
  minPaymentPercent: number; // процент от долга для мин. платежа
  monthlyInterest?: number; // проценты банка за месяц
  isInGracePeriod?: boolean; // находится ли в льготном периоде
  cardNumberLast4: string | null;
};

type CreditCardsListProps = {
  cards: CreditCard[];
  onEdit?: (card: CreditCard) => void;
  onDelete?: (cardId: string) => void;
  onCardClick?: (card: CreditCard) => void;
};

export default function CreditCardsList({ cards, onEdit, onDelete, onCardClick }: CreditCardsListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id ?? "");

  if (cards.length === 0) {
    return <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><CreditCardIcon className="h-12 w-12 mb-2" /><p>У вас нет добавленных кредитных карт</p></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const debt = card.debt ?? (card.limit - card.available);
        const utilizationPercent = Math.round((debt / card.limit) * 100);
        const isSelected = card.id === selectedCardId;
        return (
          <Card key={card.id} className={cn("cursor-pointer transition-all hover:shadow-md", isSelected && "ring-2 ring-primary")} onClick={() => { setSelectedCardId(card.id); onCardClick?.(card); }}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between"><span className="font-medium">{card.bank}</span>{card.cardNumberLast4 && <span className="text-xs text-muted-foreground">**** {card.cardNumberLast4}</span>}</div>
              <div><div className="text-2xl font-bold">{formatMoney(debt, card.currency)}</div><div className="text-xs text-muted-foreground">Задолженность</div></div>
              <div className="text-xs text-muted-foreground space-y-1"><div>Лимит: {formatMoney(card.limit, card.currency)}</div><div>Доступно: {formatMoney(card.available, card.currency)}</div></div>
              <div><Progress value={Math.min(utilizationPercent, 100)} className="h-2" /><div className="text-xs text-muted-foreground mt-1">Использование: {utilizationPercent}%</div></div>
              {(onEdit || onDelete) && (
                <div className="flex gap-2 pt-2 border-t">
                  {onEdit && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(card); }}><Pencil className="h-4 w-4" /></Button>}
                  {onDelete && <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm(`Удалить карту "${card.bank}"?`)) onDelete(card.id); }}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
