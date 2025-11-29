'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserProfile } from '@/lib/auth/types';
import { Organization } from '@/lib/organizations/types';
import { OrganizationOverview } from './organization-overview';
import { OrganizationModes } from './organization-modes';
import { OrganizationEmployees } from './organization-employees';
import styles from './OrganizationDetails.module.css';

interface OrganizationDetailsProps {
    organization: Organization;
    profile: UserProfile;
}

type TabType = 'overview' | 'modes' | 'employees';

export function OrganizationDetails({ organization, profile }: OrganizationDetailsProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    const tabs = [
        { id: 'overview' as TabType, label: 'Обзор', icon: '📊' },
        { id: 'modes' as TabType, label: 'Режимы', icon: '🎯' },
        { id: 'employees' as TabType, label: 'Сотрудники', icon: '👥' },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>{organization.name}</h1>
                    <p>Управление организацией</p>
                </div>
                <Link href="/admin/settings/organization" className={styles.backLink}>
                    ← Назад к списку
                </Link>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <nav className={styles.tabsNav}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        >
                            <span className={styles.tabIcon}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className={styles.content}>
                {activeTab === 'overview' && <OrganizationOverview organization={organization} />}
                {activeTab === 'modes' && <OrganizationModes organization={organization} profile={profile} />}
                {activeTab === 'employees' && <OrganizationEmployees organization={organization} profile={profile} />}
            </div>
        </div>
    );
}
