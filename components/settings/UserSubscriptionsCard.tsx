"use client";

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Calendar, Sparkles, TrendingUp } from 'lucide-react';

interface UserSubscription {
  id: string;
  mode: string;
  status: string;
  plan_name: string;
  billing_period: string;
  current_period_end: string;
  amount: number;
  features?: string[];
}

interface UserSubscriptionsCardProps {
  subscriptions: UserSubscription[];
}

const modeLabels: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  finance: { 
    name: 'Финансы', 
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-emerald-500'
  },
  investments: { 
    name: 'Инвестиции', 
    icon: <Sparkles className="h-5 w-5" />,
    color: 'bg-purple-500'
  },
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Активна', variant: 'default' },
  trial: { label: 'Пробный период', variant: 'secondary' },
  expired: { label: 'Истекла', variant: 'destructive' },
  cancelled: { label: 'Отменена', variant: 'outline' },
  suspended: { label: 'Приостановлена', variant: 'outline' },
};

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function UserSubscriptionsCard({ subscriptions }: UserSubscriptionsCardProps) {
  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Мои подписки
        </CardTitle>
        <CardDescription>
          Ваши индивидуальные подписки на режимы приложения
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptions.map((sub) => {
          const mode = modeLabels[sub.mode] || { name: sub.mode, icon: null, color: 'bg-gray-500' };
          const status = statusLabels[sub.status] || { label: sub.status, variant: 'outline' as const };
          
          return (
            <div 
              key={sub.id} 
              className="flex items-start gap-4 p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50"
            >
              {/* Иконка режима */}
              <div className={`p-3 rounded-lg ${mode.color} text-white`}>
                {mode.icon}
              </div>
              
              {/* Информация о подписке */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{mode.name}</h4>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  Тариф: <span className="font-medium">{sub.plan_name}</span>
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {sub.status === 'active' || sub.status === 'trial' 
                        ? `Активна до ${formatDate(sub.current_period_end)}`
                        : `Истекла ${formatDate(sub.current_period_end)}`
                      }
                    </span>
                  </div>
                  
                  {sub.amount > 0 && (
                    <div className="font-medium text-gray-700">
                      {formatMoney(sub.amount)}/{sub.billing_period === 'yearly' ? 'год' : 'мес'}
                    </div>
                  )}
                </div>
                
                {/* Функции тарифа */}
                {sub.features && sub.features.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {sub.features.slice(0, 5).map((feature, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                      >
                        {feature}
                      </span>
                    ))}
                    {sub.features.length > 5 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                        +{sub.features.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
