'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPayment } from '@/app/(protected)/superadmin/actions';
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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  organizationId: string;
  organizationName: string;
  suggestedAmount?: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  subscriptionId,
  organizationId,
  organizationName,
  suggestedAmount = 0,
}: PaymentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amountRubles, setAmountRubles] = useState(suggestedAmount > 0 ? (suggestedAmount / 100).toString() : '');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [description, setDescription] = useState('');

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

    const amountKopecks = Math.round(parseFloat(amountRubles) * 100);

    if (isNaN(amountKopecks) || amountKopecks <= 0) {
      setError('Введите корректную сумму');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('subscription_id', subscriptionId);
    formData.append('organization_id', organizationId);
    formData.append('amount', amountKopecks.toString());
    formData.append('payment_method', paymentMethod);
    formData.append('description', description);

    const result = await addPayment(formData);
    
    if (!result.success) {
      setError(result.error || 'Ошибка');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить платёж</DialogTitle>
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
              <Label htmlFor="amount">Сумма (₽)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amountRubles}
                onChange={e => setAmountRubles(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              {suggestedAmount > 0 && (
                <p className="text-sm text-gray-500">
                  Рекомендуемая сумма: {formatMoney(suggestedAmount)}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0"
                    onClick={() => setAmountRubles((suggestedAmount / 100).toString())}
                  >
                    Применить
                  </Button>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Способ оплаты</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Банковский перевод</SelectItem>
                  <SelectItem value="card">Банковская карта</SelectItem>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="crypto">Криптовалюта</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Комментарий к платежу..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Добавить платёж'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
