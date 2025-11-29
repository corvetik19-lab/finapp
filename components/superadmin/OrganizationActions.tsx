'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, OrganizationSubscription } from '@/types/billing';
import { SubscriptionModal } from './SubscriptionModal';
import { PaymentModal } from './PaymentModal';
import { ConfirmModal } from './ConfirmModal';
import { renewOrganizationSubscription, cancelOrganizationSubscription } from '@/app/(protected)/superadmin/actions';
import styles from '@/app/(protected)/superadmin/superadmin.module.css';

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
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button
          className={`${styles.button} ${styles.primary}`}
          onClick={() => setShowSubscriptionModal(true)}
        >
          <span className="material-icons">edit</span>
          {subscription ? 'Редактировать' : 'Создать подписку'}
        </button>

        {subscription && subscription.status !== 'cancelled' && (
          <>
            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setShowRenewModal(true)}
            >
              <span className="material-icons">autorenew</span>
              Продлить
            </button>

            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setShowSubscriptionModal(true)}
            >
              <span className="material-icons">upgrade</span>
              Сменить тариф
            </button>

            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setShowPaymentModal(true)}
            >
              <span className="material-icons">add_card</span>
              Добавить платёж
            </button>

            <button
              className={`${styles.button} ${styles.danger}`}
              onClick={() => setShowCancelModal(true)}
            >
              <span className="material-icons">cancel</span>
              Отменить
            </button>
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
