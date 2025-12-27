"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Pencil, Trash2, Check, X } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";

export type CreditCard = {
  id: string;
  bank: string;
  balance: number;
  limit: number;
  available: number;
  debt?: number;
  currency: string;
  interestRate: number;
  gracePeriod: number;
  gracePeriodActive?: boolean; // флаг активации льготного периода
  gracePeriodStartDate?: string | null; // дата начала льготного периода
  nextPaymentDate: string | null;
  minPayment: number;
  minPaymentPercent: number;
  monthlyInterest?: number;
  isInGracePeriod?: boolean;
  gracePeriodRemaining?: number; // оставшиеся дни льготного периода (0 если закончился)
  cardNumberLast4: string | null;
};

type CreditCardsListProps = {
  cards: CreditCard[];
  onEdit?: (card: CreditCard) => void;
  onDelete?: (cardId: string) => void;
  onCardClick?: (card: CreditCard) => void;
  onUpdateMinPayment?: (cardId: string, amount: number) => void;
};

export default function CreditCardsList({ cards, onEdit, onDelete, onCardClick, onUpdateMinPayment }: CreditCardsListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id ?? "");
  const [editingMinPaymentId, setEditingMinPaymentId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMinPaymentId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingMinPaymentId]);

  const handleStartEdit = (e: React.MouseEvent, card: CreditCard) => {
    e.stopPropagation();
    setEditingMinPaymentId(card.id);
    setEditingValue((card.minPayment / 100).toFixed(2));
  };

  const handleSaveMinPayment = (cardId: string) => {
    const amount = Math.round(parseFloat(editingValue) * 100);
    if (!isNaN(amount) && amount >= 0 && onUpdateMinPayment) {
      onUpdateMinPayment(cardId, amount);
    }
    setEditingMinPaymentId(null);
  };

  const handleCancelEdit = () => {
    setEditingMinPaymentId(null);
  };

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
              
              {/* Минимальный платёж */}
              {debt > 0 && (() => {
                const principalPayment = Math.round(debt * card.minPaymentPercent / 100);
                const interestPayment = Math.max(0, card.minPayment - principalPayment);
                const isEditing = editingMinPaymentId === card.id;
                
                return (
                  <div className={cn(
                    "rounded-lg p-2 space-y-1",
                    card.isInGracePeriod 
                      ? "bg-green-50 dark:bg-green-950/30" 
                      : "bg-amber-50 dark:bg-amber-950/30"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-xs font-medium",
                        card.isInGracePeriod 
                          ? "text-green-800 dark:text-green-200" 
                          : "text-amber-800 dark:text-amber-200"
                      )}>Мин. платёж:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveMinPayment(card.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="h-6 w-24 text-xs px-1"
                          />
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleSaveMinPayment(card.id)}><Check className="h-3 w-3 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancelEdit}><X className="h-3 w-3 text-red-600" /></Button>
                        </div>
                      ) : (
                        <span 
                          className={cn(
                            "text-sm font-bold cursor-pointer hover:underline",
                            card.isInGracePeriod 
                              ? "text-green-900 dark:text-green-100" 
                              : "text-amber-900 dark:text-amber-100"
                          )}
                          onClick={(e) => handleStartEdit(e, card)}
                          title="Нажмите для редактирования"
                        >
                          {formatMoney(card.minPayment, card.currency)}
                        </span>
                      )}
                    </div>
                    {/* Показываем оставшиеся дни льготного периода */}
                    {card.isInGracePeriod && card.gracePeriodRemaining != null && card.gracePeriodRemaining > 0 && (
                      <div className="text-[10px] text-green-700 dark:text-green-300 font-medium">
                        Льготный период: {card.gracePeriodRemaining} {card.gracePeriodRemaining === 1 ? 'день' : card.gracePeriodRemaining < 5 ? 'дня' : 'дней'}
                      </div>
                    )}
                    {/* Показываем разбивку только если льготный период НЕ активен И есть что показывать */}
                    {!card.isInGracePeriod && (principalPayment > 0 || interestPayment > 0) && (
                      <div className={cn(
                        "text-[10px] space-y-0.5",
                        "text-amber-700 dark:text-amber-300"
                      )}>
                        <div className="flex justify-between">
                          <span>Погашение долга ({card.minPaymentPercent}%):</span>
                          <span>{formatMoney(principalPayment, card.currency)}</span>
                        </div>
                        {interestPayment > 0 && (
                          <div className="flex justify-between">
                            <span>Проценты:</span>
                            <span>{formatMoney(interestPayment, card.currency)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              
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
