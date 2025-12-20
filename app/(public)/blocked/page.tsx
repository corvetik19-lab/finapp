'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock, CreditCard, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

function BlockedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'blocked';
  const orgName = searchParams.get('org') || '';

  const isSubscriptionIssue = reason === 'subscription_expired' || reason === 'subscription_cancelled';
  const isBlocked = reason === 'blocked';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
            isBlocked ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {isBlocked ? (
              <Lock className="h-8 w-8 text-red-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isBlocked ? 'Доступ заблокирован' : 'Подписка истекла'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {orgName && <span className="font-medium">{orgName}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isBlocked ? (
            <div className="text-center text-gray-600">
              <p>Ваша организация была заблокирована администратором платформы.</p>
              <p className="mt-2">Для разблокировки свяжитесь с поддержкой.</p>
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <p>Подписка вашей организации истекла или была отменена.</p>
              <p className="mt-2">Для продолжения работы необходимо продлить подписку.</p>
            </div>
          )}

          <div className="space-y-3">
            {isSubscriptionIssue && (
              <Button asChild className="w-full" size="lg">
                <Link href="/admin/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Продлить подписку
                </Link>
              </Button>
            )}
            
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="mailto:support@finapp.ru">
                <Mail className="mr-2 h-4 w-4" />
                Связаться с поддержкой
              </Link>
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                Войти под другим аккаунтом
              </Link>
            </Button>
          </div>

          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Если вы считаете, что это ошибка, обратитесь в службу поддержки</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BlockedContent />
    </Suspense>
  );
}
