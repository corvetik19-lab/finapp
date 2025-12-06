'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/billing';
import { updatePlanPricing } from '@/app/(protected)/superadmin/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pencil, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface PricingManagerProps {
  plans: SubscriptionPlan[];
}

export function PricingManager({ plans }: PricingManagerProps) {
  const router = useRouter();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Форма редактирования
  const [formData, setFormData] = useState({
    base_price_monthly: '',
    base_price_yearly: '',
    price_per_user_monthly: '',
    price_per_user_yearly: '',
    users_included: '',
    max_users: '',
  });

  const formatMoney = (kopecks: number) => {
    if (kopecks === 0) return 'Бесплатно';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      base_price_monthly: (plan.base_price_monthly / 100).toString(),
      base_price_yearly: (plan.base_price_yearly / 100).toString(),
      price_per_user_monthly: (plan.price_per_user_monthly / 100).toString(),
      price_per_user_yearly: (plan.price_per_user_yearly / 100).toString(),
      users_included: plan.users_included.toString(),
      max_users: plan.max_users?.toString() || '',
    });
    setError(null);
  };

  const closeModal = () => {
    setEditingPlan(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set('plan_id', editingPlan.id);
    fd.set('base_price_monthly', formData.base_price_monthly);
    fd.set('base_price_yearly', formData.base_price_yearly);
    fd.set('price_per_user_monthly', formData.price_per_user_monthly);
    fd.set('price_per_user_yearly', formData.price_per_user_yearly);
    fd.set('users_included', formData.users_included);
    fd.set('max_users', formData.max_users);

    const result = await updatePlanPricing(fd);

    if (result.success) {
      setSuccess(`Цены для "${editingPlan.name}" обновлены`);
      setTimeout(() => setSuccess(null), 3000);
      router.refresh();
      closeModal();
    } else {
      setError(result.error || 'Ошибка сохранения');
    }

    setLoading(false);
  };

  return (
    <>
      {success && (
        <Alert className="mb-5 bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Цены на тарифы ({plans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Тариф</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Базовая (месяц)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Базовая (год)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">За польз. (месяц)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">За польз. (год)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Включено</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Макс.</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-semibold">{plan.name}</span>
                      {plan.is_default && (
                        <Badge variant="secondary" className="ml-2 text-xs">По умолчанию</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-purple-600 tabular-nums">
                      {formatMoney(plan.base_price_monthly)}
                    </td>
                    <td className="py-3 px-4 tabular-nums">{formatMoney(plan.base_price_yearly)}</td>
                    <td className="py-3 px-4 tabular-nums">{formatMoney(plan.price_per_user_monthly)}</td>
                    <td className="py-3 px-4 tabular-nums">{formatMoney(plan.price_per_user_yearly)}</td>
                    <td className="py-3 px-4">{plan.users_included}</td>
                    <td className="py-3 px-4">{plan.max_users || '∞'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button size="sm" onClick={() => openEditModal(plan)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Изменить цены
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Информационный блок */}
      <Card>
        <CardContent className="p-6">
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <Info className="h-5 w-5 text-purple-600" />
            Как работает ценообразование
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="font-medium text-gray-700 mb-1">Базовая стоимость</div>
              <p className="text-sm text-gray-500">
                Фиксированная цена тарифа без учёта дополнительных пользователей
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Цена за пользователя</div>
              <p className="text-sm text-gray-500">
                Стоимость каждого пользователя сверх включённого количества
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Включено пользователей</div>
              <p className="text-sm text-gray-500">
                Количество пользователей, входящих в базовую стоимость
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Формула расчёта</div>
              <p className="text-sm text-gray-500">
                Итого = База + (Пользователей − Включено) × Цена за польз.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно редактирования */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Изменить цены: {editingPlan?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Базовая стоимость тарифа</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_monthly">За месяц (₽)</Label>
                  <Input
                    id="base_monthly"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price_monthly}
                    onChange={(e) => setFormData({ ...formData, base_price_monthly: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_yearly">За год (₽)</Label>
                  <Input
                    id="base_yearly"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price_yearly}
                    onChange={(e) => setFormData({ ...formData, base_price_yearly: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">За дополнительного пользователя</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_monthly">За месяц (₽)</Label>
                  <Input
                    id="user_monthly"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_user_monthly}
                    onChange={(e) => setFormData({ ...formData, price_per_user_monthly: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_yearly">За год (₽)</Label>
                  <Input
                    id="user_yearly"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_user_yearly}
                    onChange={(e) => setFormData({ ...formData, price_per_user_yearly: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Лимиты пользователей</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="users_included">Включено в тариф</Label>
                  <Input
                    id="users_included"
                    type="number"
                    min="1"
                    value={formData.users_included}
                    onChange={(e) => setFormData({ ...formData, users_included: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_users">Максимум (пусто = безлимит)</Label>
                  <Input
                    id="max_users"
                    type="number"
                    min="1"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                    placeholder="∞"
                  />
                </div>
              </div>
            </div>

            {/* Предварительный расчёт */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Пример расчёта для 10 пользователей</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Месячная оплата:</span>
                  <span className="ml-2 font-semibold text-purple-600">
                    {formatMoney(
                      (parseFloat(formData.base_price_monthly) || 0) * 100 +
                      Math.max(0, 10 - (parseInt(formData.users_included) || 1)) *
                      (parseFloat(formData.price_per_user_monthly) || 0) * 100
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Годовая оплата:</span>
                  <span className="ml-2 font-semibold text-purple-600">
                    {formatMoney(
                      (parseFloat(formData.base_price_yearly) || 0) * 100 +
                      Math.max(0, 10 - (parseInt(formData.users_included) || 1)) *
                      (parseFloat(formData.price_per_user_yearly) || 0) * 100
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={loading}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить цены'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
