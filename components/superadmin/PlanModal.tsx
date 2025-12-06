'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/billing';
import { createPlan, updatePlan } from '@/app/(protected)/superadmin/actions';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: SubscriptionPlan | null;
}

// Пока доступен только режим "Тендеры", остальные скрыты
const AVAILABLE_MODES = [
  { key: 'tenders', label: 'Тендеры' },
  // { key: 'finance', label: 'Финансы' },        // Скрыто - в разработке
  // { key: 'investments', label: 'Инвестиции' }, // Скрыто - в разработке
  // { key: 'personal', label: 'Личные финансы' }, // Скрыто - в разработке
];

export function PlanModal({ isOpen, onClose, plan }: PlanModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [basePriceMonthly, setBasePriceMonthly] = useState(plan ? (plan.base_price_monthly / 100).toString() : '');
  const [basePriceYearly, setBasePriceYearly] = useState(plan ? (plan.base_price_yearly / 100).toString() : '');
  const [pricePerUserMonthly, setPricePerUserMonthly] = useState(plan ? (plan.price_per_user_monthly / 100).toString() : '');
  const [pricePerUserYearly, setPricePerUserYearly] = useState(plan ? (plan.price_per_user_yearly / 100).toString() : '');
  const [usersIncluded, setUsersIncluded] = useState(plan?.users_included.toString() || '1');
  const [maxUsers, setMaxUsers] = useState(plan?.max_users?.toString() || '');
  const [allowedModes, setAllowedModes] = useState<string[]>(plan?.allowed_modes || ['tenders']);
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);

  const toggleMode = (mode: string) => {
    if (allowedModes.includes(mode)) {
      setAllowedModes(allowedModes.filter(m => m !== mode));
    } else {
      setAllowedModes([...allowedModes, mode]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Введите название тарифа');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('base_price_monthly', Math.round(parseFloat(basePriceMonthly || '0') * 100).toString());
    formData.append('base_price_yearly', Math.round(parseFloat(basePriceYearly || '0') * 100).toString());
    formData.append('price_per_user_monthly', Math.round(parseFloat(pricePerUserMonthly || '0') * 100).toString());
    formData.append('price_per_user_yearly', Math.round(parseFloat(pricePerUserYearly || '0') * 100).toString());
    formData.append('users_included', usersIncluded || '1');
    formData.append('max_users', maxUsers || '');
    formData.append('allowed_modes', allowedModes.join(','));
    formData.append('is_active', isActive.toString());

    if (plan) {
      formData.append('plan_id', plan.id);
      const result = await updatePlan(formData);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        setLoading(false);
        return;
      }
    } else {
      const result = await createPlan(formData);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? 'Редактировать тариф' : 'Создать тариф'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Бизнес"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Краткое описание тарифа..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePriceMonthly">Цена/месяц (₽)</Label>
                <Input
                  id="basePriceMonthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePriceMonthly}
                  onChange={e => setBasePriceMonthly(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePriceYearly">Цена/год (₽)</Label>
                <Input
                  id="basePriceYearly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePriceYearly}
                  onChange={e => setBasePriceYearly(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerUserMonthly">За польз./месяц (₽)</Label>
                <Input
                  id="pricePerUserMonthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerUserMonthly}
                  onChange={e => setPricePerUserMonthly(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerUserYearly">За польз./год (₽)</Label>
                <Input
                  id="pricePerUserYearly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerUserYearly}
                  onChange={e => setPricePerUserYearly(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usersIncluded">Включено пользователей</Label>
                <Input
                  id="usersIncluded"
                  type="number"
                  min="1"
                  value={usersIncluded}
                  onChange={e => setUsersIncluded(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Макс. пользователей</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="0"
                  value={maxUsers}
                  onChange={e => setMaxUsers(e.target.value)}
                  placeholder="∞ (оставьте пустым)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Доступные режимы</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_MODES.map(mode => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => toggleMode(mode.key)}
                    className={cn(
                      "px-3 py-2 text-sm rounded-md transition-colors",
                      allowedModes.includes(mode.key)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {plan && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Тариф активен</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : plan ? 'Сохранить' : 'Создать тариф'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
