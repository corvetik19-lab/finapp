"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import type { UserSubscriptionPlan } from '@/types/user-billing';

interface AddUserSubscriptionModalProps {
  plans: UserSubscriptionPlan[];
}

export function AddUserSubscriptionModal({ plans }: AddUserSubscriptionModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [userId, setUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [trialDays, setTrialDays] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/superadmin/user-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          plan_id: planId,
          billing_period: billingPeriod,
          discount_percent: discountPercent,
          trial_days: trialDays,
          mode: 'finance',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка создания подписки');
      }

      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить подписку
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Добавить подписку пользователя</DialogTitle>
            <DialogDescription>
              Создайте подписку на режим Финансы для пользователя
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID пользователя (UUID)</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-gray-500">
                Можно найти в разделе &quot;Пользователи&quot;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Тарифный план</Label>
              <Select value={planId} onValueChange={setPlanId} required>
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

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="trial">Пробный период (дней)</Label>
                <Input
                  id="trial"
                  type="number"
                  min="0"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                />
              </div>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !userId || !planId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать подписку
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
