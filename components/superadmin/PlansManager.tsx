'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/billing';
import { PlanModal } from './PlanModal';
import { ConfirmModal } from './ConfirmModal';
import { togglePlanActive, updateAllPlansModes } from '@/app/(protected)/superadmin/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gavel, Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlansManagerProps {
  plans: SubscriptionPlan[];
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

export function PlansManager({ plans }: PlansManagerProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [togglingPlan, setTogglingPlan] = useState<SubscriptionPlan | null>(null);
  const [updatingModes, setUpdatingModes] = useState(false);

  const handleToggle = async () => {
    if (!togglingPlan) return { success: false, error: 'Нет плана' };
    
    const result = await togglePlanActive(togglingPlan.id, !togglingPlan.is_active);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleSetTendersOnly = async () => {
    setUpdatingModes(true);
    const result = await updateAllPlansModes();
    if (result.success) {
      router.refresh();
    }
    setUpdatingModes(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Все тарифы ({plans.length})</CardTitle>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={handleSetTendersOnly}
              disabled={updatingModes}
              title="Установить только режим Тендеры для всех тарифов"
            >
              <Gavel className="h-4 w-4 mr-2" />
              {updatingModes ? 'Обновление...' : 'Только Тендеры'}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать тариф
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Название</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Описание</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Цена (месяц)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Цена (год)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">За пользователя</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Включено</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Макс.</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Режимы</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className={cn("border-b last:border-0 hover:bg-gray-50", !plan.is_active && "opacity-50")}>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{plan.name}</div>
                      {plan.is_default && (
                        <Badge variant="secondary" className="mt-1 text-xs">По умолчанию</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] text-sm text-gray-500">
                      {plan.description || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold tabular-nums">
                      {plan.base_price_monthly > 0 ? formatMoney(plan.base_price_monthly) : 'Бесплатно'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold tabular-nums">
                        {plan.base_price_yearly > 0 ? formatMoney(plan.base_price_yearly) : 'Бесплатно'}
                      </div>
                      {plan.base_price_yearly > 0 && plan.base_price_monthly > 0 && (
                        <div className="text-xs text-green-600">
                          −{Math.round((1 - plan.base_price_yearly / (plan.base_price_monthly * 12)) * 100)}%
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {plan.price_per_user_monthly > 0 ? (
                        <>
                          <div className="font-semibold tabular-nums">{formatMoney(plan.price_per_user_monthly)}</div>
                          <div className="text-xs text-gray-500">/мес</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">{plan.users_included}</td>
                    <td className="py-3 px-4">{plan.max_users || '∞'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {plan.allowed_modes.map((mode) => (
                          <Badge key={mode} variant="outline" className="text-xs">{mode}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          title="Редактировать"
                          onClick={() => setEditingPlan(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline"
                          size="icon"
                          title={plan.is_active ? 'Деактивировать' : 'Активировать'}
                          onClick={() => setTogglingPlan(plan)}
                        >
                          {plan.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Модалка создания */}
      <PlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Модалка редактирования */}
      <PlanModal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        plan={editingPlan}
      />

      {/* Подтверждение переключения */}
      <ConfirmModal
        isOpen={!!togglingPlan}
        onClose={() => setTogglingPlan(null)}
        onConfirm={handleToggle}
        title={togglingPlan?.is_active ? 'Деактивировать тариф' : 'Активировать тариф'}
        message={
          togglingPlan?.is_active 
            ? `Вы уверены, что хотите деактивировать тариф "${togglingPlan?.name}"? Новые подписки на этот тариф будут недоступны.`
            : `Вы уверены, что хотите активировать тариф "${togglingPlan?.name}"?`
        }
        confirmText={togglingPlan?.is_active ? 'Деактивировать' : 'Активировать'}
        confirmVariant={togglingPlan?.is_active ? 'danger' : 'primary'}
      />
    </>
  );
}
