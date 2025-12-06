import { getAllPayments } from '@/lib/billing/subscription-service';
import type { PaymentStatus } from '@/types/billing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Receipt, Plus } from 'lucide-react';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<PaymentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  completed: { variant: 'default', label: 'Оплачен' },
  pending: { variant: 'secondary', label: 'Ожидает' },
  processing: { variant: 'secondary', label: 'Обработка' },
  failed: { variant: 'destructive', label: 'Ошибка' },
  refunded: { variant: 'outline', label: 'Возврат' },
};

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const payments = await getAllPayments(100);

  // Считаем статистику
  const totalAmount = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">История платежей</h1>
        <p className="text-gray-500 mt-1">Все платежи за подписки на платформе</p>
      </header>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-green-700 font-medium">Всего оплачено</span>
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-700">{formatMoney(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-amber-700 font-medium">Ожидают оплаты</span>
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-700">{formatMoney(pendingAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Всего платежей</span>
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица платежей */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Последние платежи</CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Добавить платёж
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Организация</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Метод оплаты</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const statusConf = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={payment.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payment.payment_date 
                            ? formatDateTime(payment.payment_date) 
                            : formatDateTime(payment.created_at)
                          }
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                              {(payment.organization as { name?: string })?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-gray-900">
                              {(payment.organization as { name?: string })?.name || 'Неизвестно'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-lg font-bold text-gray-900 tabular-nums">
                            {formatMoney(payment.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{payment.payment_method || '—'}</td>
                        <td className="py-3 px-4 text-gray-500 text-sm">{payment.description || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Нет платежей</h3>
              <p className="text-gray-400">Платежи появятся после оплаты подписок</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
