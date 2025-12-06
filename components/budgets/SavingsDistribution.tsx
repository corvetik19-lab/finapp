"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Save, Loader2, Trash2, Pencil, Eye, EyeOff, Send, CreditCard } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type DebitCard = {
  id: string;
  name: string;
  balance: number;
};

type Distribution = {
  accountId: string;
  amount: number;
};

type Props = {
  totalSavings: number;
  debitCards: DebitCard[];
  initialDistributions?: Array<{ account_id: string; amount: number }>;
};

export default function SavingsDistribution({ totalSavings, debitCards, initialDistributions = [] }: Props) {
  const [distributions, setDistributions] = useState<Distribution[]>(() => {
    // Загружаем сохраненные распределения или инициализируем нулями
    return debitCards.map(card => {
      const saved = initialDistributions.find(d => d.account_id === card.id);
      return { accountId: card.id, amount: saved?.amount || 0 };
    });
  });
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(() => {
    // Загружаем скрытые карты из localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenDebitCards');
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
  const remaining = totalSavings - totalDistributed;

  const toggleCardVisibility = (cardId: string) => {
    setHiddenCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
        // При скрытии обнуляем сумму
        setDistributions(prevDist =>
          prevDist.map(d => (d.accountId === cardId ? { ...d, amount: 0 } : d))
        );
      }
      
      // Сохраняем в localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hiddenDebitCards', JSON.stringify(Array.from(newSet)));
      }
      
      return newSet;
    });
  };

  const visibleCards = debitCards.filter(card => !hiddenCards.has(card.id));
  const hiddenCardsCount = hiddenCards.size;

  const handleAmountChange = (accountId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const amountInMinor = Math.round(amount * 100);
    
    // Проверяем что общая сумма не превышает планируемую экономию
    setDistributions(prev => {
      const newDistributions = prev.map(d => 
        d.accountId === accountId ? { ...d, amount: amountInMinor } : d
      );
      
      const newTotal = newDistributions.reduce((sum, d) => sum + d.amount, 0);
      
      // Если превышает лимит, не обновляем
      if (newTotal > totalSavings) {
        return prev;
      }
      
      return newDistributions;
    });
  };
  const handleClear = () => {
    setDistributions(debitCards.map(card => ({ accountId: card.id, amount: 0 })));
  };

  const handleDelete = async () => {
    if (!confirm('Удалить сохраненный план распределения?')) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Удаляем все распределения (отправляем пустой массив)
      const response = await fetch("/api/savings-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributions: [],
          totalAmount: 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      // Очищаем локальное состояние
      handleClear();
      setSaveMessage("✅ План удален!");
      setTimeout(() => {
        setSaveMessage(null);
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error deleting distribution:", error);
      setSaveMessage("❌ Ошибка при удалении");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (totalDistributed === 0) {
      setSaveMessage("⚠️ Введите суммы для распределения");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (totalDistributed > totalSavings) {
      setSaveMessage("⚠️ Распределено больше чем запланировано!");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Создаем транзакции для каждого распределения
      const response = await fetch("/api/savings-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributions: distributions.filter(d => d.amount > 0),
          totalAmount: totalDistributed,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при сохранении");
      }

      setSaveMessage("✅ Распределение сохранено!");
      setTimeout(() => {
        setSaveMessage(null);
        window.location.reload(); // Перезагружаем страницу чтобы обновить данные
      }, 2000);
    } catch (error) {
      console.error("Error saving distribution:", error);
      setSaveMessage("❌ Ошибка при сохранении");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">💰 Распределение экономии</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Планируемая экономия: <strong>{formatMoney(totalSavings, "RUB")}</strong>
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {isExpanded ? "Свернуть" : "Развернуть"}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Сохраненный план */}
            {totalDistributed > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4" />
                    Сохраненный план распределения
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete} disabled={isSaving}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {distributions.filter(d => d.amount > 0).map(dist => {
                    const card = debitCards.find(c => c.id === dist.accountId);
                    if (!card) return null;
                    const percentage = totalSavings > 0 ? (dist.amount / totalSavings) * 100 : 0;
                    return (
                      <div key={dist.accountId} className="flex items-center gap-3 bg-background rounded p-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{card.name}</div>
                          <div className="text-xs text-muted-foreground">{formatMoney(dist.amount, "RUB")}</div>
                        </div>
                        <div className="text-xs font-medium text-blue-600">{percentage.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Карты для распределения */}
            <div className="grid gap-4 md:grid-cols-2">
              {debitCards.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Нет дебетовых карт для распределения экономии.<br />
                  Добавьте дебетовые карты в разделе &quot;Карты&quot;.
                </div>
              ) : (
                visibleCards.map((card) => {
                  const distribution = distributions.find(d => d.accountId === card.id);
                  const amount = distribution?.amount || 0;
                  const percentage = totalSavings > 0 ? (amount / totalSavings) * 100 : 0;
                  return (
                    <Card key={card.id} className="border">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <CreditCard className="h-4 w-4" /> {card.name}
                            </div>
                            <div className="text-xs text-muted-foreground">Баланс: {formatMoney(card.balance, "RUB")}</div>
                          </div>
                          <div className="text-sm font-medium text-blue-600">{percentage.toFixed(1)}%</div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Сумма для распределения (₽)
                            {remaining < totalSavings && (
                              <span className="text-muted-foreground ml-1">• Осталось: {formatMoney(remaining, "RUB")}</span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={totalSavings / 100}
                            value={amount === 0 ? '' : amount / 100}
                            onChange={(e) => handleAmountChange(card.id, e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        {amount > 0 && (
                          <div className="text-sm text-green-600">
                            Новый баланс: <strong>{formatMoney(card.balance + amount, "RUB")}</strong>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {amount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => {
                              const params = new URLSearchParams({
                                type: 'transfer', to_account: card.id,
                                amount: (amount / 100).toString(),
                                note: `Распределение экономии на ${card.name}`
                              });
                              router.push(`/transactions?${params.toString()}`);
                            }}>
                              <Send className="h-3 w-3 mr-1" /> Внести
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => toggleCardVisibility(card.id)}>
                            <EyeOff className="h-3 w-3 mr-1" /> Скрыть
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Скрытые карты */}
            {hiddenCardsCount > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <EyeOff className="h-4 w-4" /> Скрытые карты ({hiddenCardsCount})
                </div>
                <div className="flex flex-wrap gap-2">
                  {debitCards.filter(card => hiddenCards.has(card.id)).map(card => (
                    <div key={card.id} className="flex items-center gap-2 bg-background rounded px-2 py-1 text-sm">
                      <CreditCard className="h-3 w-3" /> {card.name}
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleCardVisibility(card.id)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Итоги */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Всего для распределения:</span>
                <strong>{formatMoney(totalSavings, "RUB")}</strong>
              </div>
              <div className="flex justify-between">
                <span>Распределено:</span>
                <strong className={totalDistributed > totalSavings ? "text-red-600" : ""}>
                  {formatMoney(totalDistributed, "RUB")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Осталось:</span>
                <strong className={remaining < 0 ? "text-red-600" : "text-green-600"}>
                  {formatMoney(remaining, "RUB")}
                </strong>
              </div>
              {totalDistributed > totalSavings && (
                <div className="text-red-600 text-center pt-2">⚠️ Распределено больше чем запланировано!</div>
              )}
            </div>

            {saveMessage && (
              <div className="text-center py-2 text-sm">{saveMessage}</div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || totalDistributed === 0}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isSaving ? "Сохранение..." : "Сохранить распределение"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
