"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { UserSubscriptionListItem, UserSubscriptionPlan } from '@/types/user-billing';

interface EditUserSubscriptionModalProps {
  subscription: UserSubscriptionListItem;
  plans: UserSubscriptionPlan[];
  open: boolean;
  onClose: () => void;
}

export function EditUserSubscriptionModal({ 
  subscription, 
  plans, 
  open, 
  onClose 
}: EditUserSubscriptionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [planId, setPlanId] = useState(subscription.plan_id || '');
  const [status, setStatus] = useState(subscription.status);
  const [billingPeriod, setBillingPeriod] = useState(subscription.billing_period);
  const [discountPercent, setDiscountPercent] = useState(subscription.discount_percent);
  const [notes, setNotes] = useState(subscription.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/superadmin/user-subscriptions/${subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          status,
          billing_period: billingPeriod,
          discount_percent: discountPercent,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка обновления подписки');
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === planId);
  const price = selectedPlan 
    ? (billingPeriod === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly)
    : 0;
  const discountAmount = Math.round(price * (discountPercent / 100));
  const finalPrice = price - discountAmount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Редактировать подписку</DialogTitle>
            <DialogDescription>
              {subscription.user?.full_name || subscription.user?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Тарифный план</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — {(plan.price_monthly / 100).toLocaleString('ru-RU')} ₽/мес
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активна</SelectItem>
                  <SelectItem value="trial">Пробная</SelectItem>
                  <SelectItem value="expired">Истекла</SelectItem>
                  <SelectItem value="cancelled">Отменена</SelectItem>
                  <SelectItem value="past_due">Просрочена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Период оплаты</Label>
              <Select value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Ежемесячно</SelectItem>
                  <SelectItem value="yearly">Ежегодно</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Скидка (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Примечания к подписке..."
                rows={3}
              />
            </div>

            {selectedPlan && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Базовая стоимость:</span>
                  <span>{(price / 100).toLocaleString('ru-RU')} ₽</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Скидка ({discountPercent}%):</span>
                    <span>-{(discountAmount / 100).toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Итого:</span>
                  <span>{(finalPrice / 100).toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
