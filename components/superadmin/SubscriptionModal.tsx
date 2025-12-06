'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, OrganizationSubscription, BillingPeriod } from '@/types/billing';
import { createOrganizationSubscription, updateOrganizationSubscription, calculateSubscriptionPrice } from '@/app/(protected)/superadmin/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2 } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  organizationId: string;
  organizationName: string;
  subscription?: OrganizationSubscription | null;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  plans,
  organizationId,
  organizationName,
  subscription,
}: SubscriptionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [planId, setPlanId] = useState(subscription?.plan_id || plans[0]?.id || '');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(subscription?.billing_period || 'monthly');
  const [usersCount, setUsersCount] = useState(subscription?.users_count || 1);
  const [discountPercent, setDiscountPercent] = useState(subscription?.discount_percent || 0);
  const [trialDays, setTrialDays] = useState(0);
  const [notes, setNotes] = useState(subscription?.notes || '');

  const [calculatedPrice, setCalculatedPrice] = useState<{
    base_amount: number;
    users_amount: number;
    extra_users: number;
    subtotal: number;
    discount_amount: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (planId) {
      calculateSubscriptionPrice(planId, usersCount, billingPeriod, discountPercent)
        .then(result => {
          if (result.success && result.data) {
            setCalculatedPrice(result.data);
          }
        });
    }
  }, [planId, usersCount, billingPeriod, discountPercent]);

  const formatMoney = (kopecks: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('organization_id', organizationId);
    formData.append('plan_id', planId);
    formData.append('billing_period', billingPeriod);
    formData.append('users_count', usersCount.toString());
    formData.append('discount_percent', discountPercent.toString());
    formData.append('notes', notes);

    if (subscription) {
      formData.append('subscription_id', subscription.id);
      const result = await updateOrganizationSubscription(formData);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        setLoading(false);
        return;
      }
    } else {
      formData.append('trial_days', trialDays.toString());
      const result = await createOrganizationSubscription(formData);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.refresh();
    onClose();
  };

  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Редактировать подписку' : 'Создать подписку'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Building2 className="h-5 w-5 text-gray-500" />
              <span className="font-medium">{organizationName}</span>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Тарифный план</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — {formatMoney(plan.base_price_monthly)}/мес
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Период оплаты</Label>
                <Select value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Месячная</SelectItem>
                    <SelectItem value="yearly">Годовая</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usersCount">Пользователей</Label>
                <Input
                  id="usersCount"
                  type="number"
                  min="1"
                  max={selectedPlan?.max_users || 1000}
                  value={usersCount}
                  onChange={e => setUsersCount(parseInt(e.target.value) || 1)}
                />
                {selectedPlan && (
                  <p className="text-xs text-gray-500">Включено: {selectedPlan.users_included}, макс: {selectedPlan.max_users || '∞'}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountPercent">Скидка (%)</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(parseInt(e.target.value) || 0)}
                />
              </div>

              {!subscription && (
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Пробный период (дней)</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min="0"
                    max="90"
                    value={trialDays}
                    onChange={e => setTrialDays(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Комментарий к подписке..."
                rows={2}
              />
            </div>

            {calculatedPrice && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-gray-700">Расчёт стоимости</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Базовая стоимость</span>
                  <span>{formatMoney(calculatedPrice.base_amount)}</span>
                </div>
                {calculatedPrice.extra_users > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">+{calculatedPrice.extra_users} доп. пользователей</span>
                    <span>{formatMoney(calculatedPrice.users_amount)}</span>
                  </div>
                )}
                {calculatedPrice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Скидка {discountPercent}%</span>
                    <span>−{formatMoney(calculatedPrice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Итого за {billingPeriod === 'yearly' ? 'год' : 'месяц'}</span>
                  <span className="text-purple-600">{formatMoney(calculatedPrice.total)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : subscription ? 'Сохранить' : 'Создать подписку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
