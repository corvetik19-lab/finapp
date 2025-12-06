'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, OrganizationSubscription } from '@/types/billing';
import { SubscriptionModal } from './SubscriptionModal';
import { PaymentModal } from './PaymentModal';
import { ConfirmModal } from './ConfirmModal';
import { renewOrganizationSubscription, cancelOrganizationSubscription } from '@/app/(protected)/superadmin/actions';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw, ArrowUpCircle, CreditCard, XCircle } from 'lucide-react';

interface OrganizationActionsProps {
  organizationId: string;
  organizationName: string;
  subscription: OrganizationSubscription | null;
  plans: SubscriptionPlan[];
}

export function OrganizationActions({
  organizationId,
  organizationName,
  subscription,
  plans,
}: OrganizationActionsProps) {
  const router = useRouter();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleRenew = async () => {
    if (!subscription) return { success: false, error: 'Нет подписки' };
    
    const formData = new FormData();
    formData.append('subscription_id', subscription.id);
    formData.append('organization_id', organizationId);
    
    const result = await renewOrganizationSubscription(formData);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleCancel = async () => {
    if (!subscription) return { success: false, error: 'Нет подписки' };
    
    const formData = new FormData();
    formData.append('subscription_id', subscription.id);
    formData.append('organization_id', organizationId);
    
    const result = await cancelOrganizationSubscription(formData);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-200">
        <Button onClick={() => setShowSubscriptionModal(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          {subscription ? 'Редактировать' : 'Создать подписку'}
        </Button>

        {subscription && subscription.status !== 'cancelled' && (
          <>
            <Button variant="outline" onClick={() => setShowRenewModal(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Продлить
            </Button>

            <Button variant="outline" onClick={() => setShowSubscriptionModal(true)}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Сменить тариф
            </Button>

            <Button variant="outline" onClick={() => setShowPaymentModal(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Добавить платёж
            </Button>

            <Button variant="destructive" onClick={() => setShowCancelModal(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Отменить
            </Button>
          </>
        )}
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        plans={plans}
        organizationId={organizationId}
        organizationName={organizationName}
        subscription={subscription}
      />

      {subscription && (
        <>
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            subscriptionId={subscription.id}
            organizationId={organizationId}
            organizationName={organizationName}
            suggestedAmount={subscription.total_amount}
          />

          <ConfirmModal
            isOpen={showRenewModal}
            onClose={() => setShowRenewModal(false)}
            onConfirm={handleRenew}
            title="Продлить подписку"
            message={`Вы уверены, что хотите продлить подписку для "${organizationName}" на следующий период?`}
            confirmText="Продлить"
          />

          <ConfirmModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancel}
            title="Отменить подписку"
            message={`Вы уверены, что хотите отменить подписку для "${organizationName}"? Организация потеряет доступ к платным функциям.`}
            confirmText="Отменить подписку"
            confirmVariant="danger"
          />
        </>
      )}
    </>
  );
}
