'use client';

import { Organization } from '@/lib/organizations/types';
import { cn } from '@/lib/utils';

interface OrganizationOverviewProps {
    organization: Organization;
}

export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
    return (
        <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Общая информация</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-muted-foreground">Название</label>
                    <p className="font-medium">{organization.name}</p>
                </div>

                <div>
                    <label className="text-sm text-muted-foreground">Статус</label>
                    <span className={cn(
                        "inline-block px-2 py-1 rounded-full text-xs font-medium",
                        organization.status === 'active' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                        {organization.status === 'active' ? 'Активна' : 'Остановлена'}
                    </span>
                </div>

                <div>
                    <label className="text-sm text-muted-foreground">План подписки</label>
                    <p className="font-medium">{organization.subscription_plan || 'Free'}</p>
                </div>

                <div>
                    <label className="text-sm text-muted-foreground">Дата создания</label>
                    <p className="font-medium">{new Date(organization.created_at).toLocaleDateString('ru-RU')}</p>
                </div>

                {organization.description && (
                    <div className="col-span-full">
                        <label className="text-sm text-muted-foreground">Описание</label>
                        <p className="font-medium">{organization.description}</p>
                    </div>
                )}

                {organization.website && (
                    <div>
                        <label className="text-sm text-muted-foreground">Веб-сайт</label>
                        <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {organization.website}
                        </a>
                    </div>
                )}

                {organization.contact_email && (
                    <div>
                        <label className="text-sm text-muted-foreground">Контактный Email</label>
                        <p className="font-medium">{organization.contact_email}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
