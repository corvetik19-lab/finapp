'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OrganizationSubscription, SubscriptionPlan } from '@/types/billing';
import { SubscriptionModal } from './SubscriptionModal';
import styles from '@/app/(protected)/superadmin/superadmin.module.css';

interface BillingActionsProps {
  subscription: OrganizationSubscription;
  plans: SubscriptionPlan[];
}

export function BillingActions({ subscription, plans }: BillingActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Link 
          href={`/superadmin/organizations/${subscription.organization_id}`}
          className={`${styles.button} ${styles.secondary}`}
          style={{ padding: '6px 12px' }}
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>visibility</span>
        </Link>
        <button 
          className={`${styles.button} ${styles.secondary}`}
          style={{ padding: '6px 12px' }}
          title="Редактировать"
          onClick={() => setShowEditModal(true)}
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
        </button>
      </div>

      <SubscriptionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        organizationId={subscription.organization_id}
        organizationName={subscription.organization?.name || 'Организация'}
        plans={plans}
        subscription={subscription}
      />
    </>
  );
}
