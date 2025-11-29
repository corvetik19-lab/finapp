'use client';

import { useState } from 'react';
import { Organization } from '@/lib/auth/types';
import { toggleOrganizationStatus, joinOrganizationAsAdmin, deleteOrganization } from '@/lib/admin/organizations';
import { useRouter } from 'next/navigation';
import styles from './OrganizationsList.module.css';

interface OrganizationsListProps {
    organizations: Organization[];
    isSuperAdmin: boolean;
    memberOrgIds?: string[];
    activeOrgId?: string | null;
}

export function OrganizationsList({ organizations, isSuperAdmin, memberOrgIds = [], activeOrgId }: OrganizationsListProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
        if (!isSuperAdmin) return;
        try {
            setLoadingId(orgId);
            await toggleOrganizationStatus(orgId, !currentStatus);
            router.refresh();
        } catch (error) {
            alert('Ошибка при обновлении статуса');
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async (orgId: string, orgName: string) => {
        if (!isSuperAdmin) return;
        
        if (!confirm(`Вы уверены, что хотите удалить организацию "${orgName}"? Это действие необратимо и удалит ВСЕ данные.`)) return;
        if (!confirm(`Подтвердите удаление организации "${orgName}".`)) return;

        try {
            setLoadingId(orgId);
            await deleteOrganization(orgId);
            router.refresh();
        } catch (error) {
            alert('Ошибка при удалении организации: ' + (error instanceof Error ? error.message : String(error)));
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleJoinOrganization = async (orgId: string) => {
        setLoadingId(orgId);
        try {
            await joinOrganizationAsAdmin(orgId);
        } catch (error) {
            alert('Ошибка при входе в организацию');
            console.error(error);
            setLoadingId(null);
            return;
        }
        // Перезагрузка страницы после успешного завершения
        router.refresh();
        setLoadingId(null);
    };

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead className={styles.thead}>
                    <tr>
                        <th className={styles.th}>Название</th>
                        <th className={styles.th}>Статус</th>
                        <th className={styles.th}>План</th>
                        <th className={styles.th}>Создана</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>Действия</th>
                    </tr>
                </thead>
                <tbody className={styles.tbody}>
                    {organizations.map((org) => {
                        const isMember = memberOrgIds.includes(org.id);
                        const isSystemOrg = org.name === 'Личное пространство'; // Системная организация
                        const isActiveOrg = activeOrgId === org.id; // Это активная организация

                        return (
                            <tr key={org.id} className={loadingId === org.id ? styles.loading : ''}>
                                <td className={styles.td}>
                                    <div className={styles.orgInfo}>
                                        <span className={styles.orgName}>
                                            {org.name}
                                            {isSystemOrg && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px' }}>SYSTEM</span>}
                                        </span>
                                        <span className={styles.orgDesc}>{org.description || 'Нет описания'}</span>
                                    </div>
                                </td>
                                <td className={styles.td}>
                                    <span className={`${styles.statusBadge} ${org.is_active ? styles.active : styles.suspended}`}>
                                        {org.is_active ? 'Активна' : 'Остановлена'}
                                    </span>
                                </td>
                                <td className={styles.td}>
                                    <span className={styles.planBadge}>
                                        {org.subscription_plan}
                                    </span>
                                </td>
                                <td className={`${styles.td} ${styles.date}`}>
                                    {new Date(org.created_at).toLocaleDateString()}
                                </td>
                                <td className={styles.td}>
                                    <div className={styles.actions}>
                                        {!isSystemOrg && (
                                            isActiveOrg ? (
                                                <span 
                                                    className={styles.activeOrgBadge}
                                                    style={{ 
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '6px 12px',
                                                        background: '#dcfce7',
                                                        color: '#166534',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    <span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span>
                                                    Работаю
                                                </span>
                                            ) : isMember ? (
                                                <button
                                                    onClick={() => handleJoinOrganization(org.id)}
                                                    disabled={loadingId === org.id}
                                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                                    title="Переключиться на эту организацию"
                                                >
                                                    Войти
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleJoinOrganization(org.id)}
                                                    disabled={loadingId === org.id}
                                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                                    title="Войти в организацию как администратор"
                                                >
                                                    Войти
                                                </button>
                                            )
                                        )}
                                        
                                        <button
                                            onClick={() => router.push(`/admin/settings/organization/${org.id}`)}
                                            className={`${styles.button} ${styles.buttonManage}`}
                                        >
                                            Управление
                                        </button>
                                        
                                        {isSuperAdmin && !isSystemOrg && (
                                            <>
                                                <button
                                                    onClick={() => handleToggleStatus(org.id, org.is_active)}
                                                    disabled={loadingId === org.id}
                                                    className={`${styles.button} ${org.is_active ? styles.buttonDanger : styles.buttonSuccess}`}
                                                >
                                                    {loadingId === org.id ? '...' : org.is_active ? 'Блокировать' : 'Активировать'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(org.id, org.name)}
                                                    disabled={loadingId === org.id}
                                                    className={`${styles.button} ${styles.buttonDanger}`}
                                                    title="Удалить организацию навсегда"
                                                    style={{ marginLeft: '0.5rem' }}
                                                >
                                                    <span className="material-icons" style={{ fontSize: '1.2rem' }}>delete</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {organizations.length === 0 && (
                        <tr>
                            <td colSpan={5} className={styles.emptyState}>
                                Нет организаций. Создайте первую!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
