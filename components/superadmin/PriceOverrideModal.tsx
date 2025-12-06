'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { OrganizationPriceOverride, SubscriptionPlan } from '@/types/billing';
import { savePriceOverride, deletePriceOverride } from '@/app/(protected)/superadmin/actions';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2 } from 'lucide-react';

interface PriceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  currentPlan: SubscriptionPlan | null;
  override: OrganizationPriceOverride | null;
}

export function PriceOverrideModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  currentPlan,
  override,
}: PriceOverrideModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Форма - значения в рублях для удобства ввода
  const [basePriceMonthly, setBasePriceMonthly] = useState('');
  const [basePriceYearly, setBasePriceYearly] = useState('');
  const [pricePerUserMonthly, setPricePerUserMonthly] = useState('');
  const [pricePerUserYearly, setPricePerUserYearly] = useState('');
  const [usersIncluded, setUsersIncluded] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [notes, setNotes] = useState('');

  // Заполняем форму при открытии
  useEffect(() => {
    if (override) {
      setBasePriceMonthly(override.base_price_monthly !== null ? (override.base_price_monthly / 100).toString() : '');
      setBasePriceYearly(override.base_price_yearly !== null ? (override.base_price_yearly / 100).toString() : '');
      setPricePerUserMonthly(override.price_per_user_monthly !== null ? (override.price_per_user_monthly / 100).toString() : '');
      setPricePerUserYearly(override.price_per_user_yearly !== null ? (override.price_per_user_yearly / 100).toString() : '');
      setUsersIncluded(override.users_included !== null ? override.users_included.toString() : '');
      setMaxUsers(override.max_users !== null ? override.max_users.toString() : '');
      setNotes(override.notes || '');
    } else {
      // Очищаем форму
      setBasePriceMonthly('');
      setBasePriceYearly('');
      setPricePerUserMonthly('');
      setPricePerUserYearly('');
      setUsersIncluded('');
      setMaxUsers('');
      setNotes('');
    }
  }, [override, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('organization_id', organizationId);
    formData.set('base_price_monthly', basePriceMonthly);
    formData.set('base_price_yearly', basePriceYearly);
    formData.set('price_per_user_monthly', pricePerUserMonthly);
    formData.set('price_per_user_yearly', pricePerUserYearly);
    formData.set('users_included', usersIncluded);
    formData.set('max_users', maxUsers);
    formData.set('notes', notes);

    const result = await savePriceOverride(formData);

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || 'Ошибка сохранения');
    }

    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm('Вернуться к стандартным ценам тарифа?')) return;
    
    setLoading(true);
    const result = await deletePriceOverride(organizationId);
    
    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || 'Ошибка удаления');
    }
    setLoading(false);
  };

  const formatMoney = (kopecks: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Индивидуальные цены</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Building2 className="h-5 w-5 text-gray-500" />
              <span className="font-medium">{organizationName}</span>
            </div>

            {currentPlan && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="font-medium">Текущий тариф: {currentPlan.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Стандартные цены: {formatMoney(currentPlan.base_price_monthly)}/мес, 
                  {formatMoney(currentPlan.price_per_user_monthly)}/польз.
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Оставьте поле пустым чтобы использовать стандартную цену тарифа.
              Заполните только те поля, которые хотите переопределить.
            </p>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Базовая стоимость</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePriceMonthly">За месяц (₽)</Label>
                  <Input
                    id="basePriceMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePriceMonthly}
                    onChange={(e) => setBasePriceMonthly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.base_price_monthly / 100).toString() : '0'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePriceYearly">За год (₽)</Label>
                  <Input
                    id="basePriceYearly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePriceYearly}
                    onChange={(e) => setBasePriceYearly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.base_price_yearly / 100).toString() : '0'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">За дополнительного сотрудника</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerUserMonthly">За месяц (₽)</Label>
                  <Input
                    id="pricePerUserMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePerUserMonthly}
                    onChange={(e) => setPricePerUserMonthly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.price_per_user_monthly / 100).toString() : '0'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerUserYearly">За год (₽)</Label>
                  <Input
                    id="pricePerUserYearly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePerUserYearly}
                    onChange={(e) => setPricePerUserYearly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.price_per_user_yearly / 100).toString() : '0'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Лимиты пользователей</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usersIncluded">Включено в тариф</Label>
                  <Input
                    id="usersIncluded"
                    type="number"
                    min="1"
                    value={usersIncluded}
                    onChange={(e) => setUsersIncluded(e.target.value)}
                    placeholder={currentPlan ? currentPlan.users_included.toString() : '1'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Максимум (пусто = ∞)</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    placeholder={currentPlan?.max_users?.toString() || '∞'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Причина индивидуальных цен..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {override && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Сбросить к стандартным
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
