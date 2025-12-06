'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OrganizationSubscription, SubscriptionPlan } from '@/types/billing';
import { SubscriptionModal } from './SubscriptionModal';
import { Button } from '@/components/ui/button';
import { Eye, Pencil } from 'lucide-react';

interface BillingActionsProps {
  subscription: OrganizationSubscription;
  plans: SubscriptionPlan[];
}

export function BillingActions({ subscription, plans }: BillingActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/superadmin/organizations/${subscription.organization_id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowEditModal(true)} title="Редактировать">
          <Pencil className="h-4 w-4" />
        </Button>
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
