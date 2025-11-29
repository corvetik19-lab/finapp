'use client';

import { Organization } from '@/lib/organizations/types';
import styles from './OrganizationDetails.module.css';

interface OrganizationOverviewProps {
    organization: Organization;
}

export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
    return (
        <div className={styles.overviewCard}>
            <h2 className={styles.overviewTitle}>Общая информация</h2>

            <div className={styles.overviewGrid}>
                <div className={styles.overviewField}>
                    <label className={styles.overviewLabel}>Название</label>
                    <p className={styles.overviewValue}>{organization.name}</p>
                </div>

                <div className={styles.overviewField}>
                    <label className={styles.overviewLabel}>Статус</label>
                    <span className={`${styles.badge} ${organization.status === 'active' ? styles.badgeActive : styles.badgeSuspended}`}>
                        {organization.status === 'active' ? 'Активна' : 'Остановлена'}
                    </span>
                </div>

                <div className={styles.overviewField}>
                    <label className={styles.overviewLabel}>План подписки</label>
                    <p className={styles.overviewValue}>{organization.subscription_plan || 'Free'}</p>
                </div>

                <div className={styles.overviewField}>
                    <label className={styles.overviewLabel}>Дата создания</label>
                    <p className={styles.overviewValue}>{new Date(organization.created_at).toLocaleDateString('ru-RU')}</p>
                </div>

                {organization.description && (
                    <div className={styles.overviewField} style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.overviewLabel}>Описание</label>
                        <p className={styles.overviewValue}>{organization.description}</p>
                    </div>
                )}

                {organization.website && (
                    <div className={styles.overviewField}>
                        <label className={styles.overviewLabel}>Веб-сайт</label>
                        <a href={organization.website} target="_blank" rel="noopener noreferrer" className={styles.overviewLink}>
                            {organization.website}
                        </a>
                    </div>
                )}

                {organization.contact_email && (
                    <div className={styles.overviewField}>
                        <label className={styles.overviewLabel}>Контактный Email</label>
                        <p className={styles.overviewValue}>{organization.contact_email}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
