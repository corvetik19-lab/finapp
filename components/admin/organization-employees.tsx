'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/auth/types';
import { Organization } from '@/lib/organizations/types';
import { loginAsEmployee } from '@/lib/admin/organizations';
import styles from './OrganizationDetails.module.css';

interface OrganizationEmployeesProps {
    organization: Organization;
    profile: UserProfile;
}

interface Employee {
    id: string;
    full_name: string;
    email: string;
    position: string | null;
    department: string | null;
    role: string;
    role_id: string | null;
    role_name: string | null;
    role_color: string | null;
    status: string;
    created_at: string;
    last_sign_in_at: string | null;
}

export function OrganizationEmployees({ organization }: OrganizationEmployeesProps) {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingIn, setLoggingIn] = useState<string | null>(null);
    
    // View Modal
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const loadEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/organizations/${organization.id}/employees`);
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    }, [organization.id]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const openViewModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowViewModal(true);
    };

    const handleLoginAsEmployee = async (employee: Employee) => {
        setLoggingIn(employee.id);
        try {
            await loginAsEmployee(employee.id, organization.id);
            router.push('/dashboard');
            router.refresh();
        } catch (error) {
            console.error('Error impersonating user:', error);
            alert(error instanceof Error ? error.message : 'Ошибка при входе под пользователем');
            setLoggingIn(null);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        return date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className={styles.employeesCard}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p style={{ marginTop: '1rem' }}>Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.employeesCard}>
            <div className={styles.employeesHeader}>
                <div>
                    <h2 className={styles.employeesTitle}>Сотрудники организации</h2>
                    <p className={styles.employeesCount}>
                        Всего сотрудников: {employees.length}
                    </p>
                </div>
            </div>

            {employees.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>👥</div>
                    <h3 className={styles.emptyStateTitle}>Нет сотрудников</h3>
                    <p className={styles.emptyStateDescription}>
                        В этой организации пока нет сотрудников.
                    </p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Сотрудник</th>
                            <th>Должность</th>
                            <th>Роль</th>
                            <th>Создан</th>
                            <th>Последний вход</th>
                            <th style={{ textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((employee) => {
                            const isAdminRole = employee.role === 'admin';

                            return (
                            <tr key={employee.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className={styles.employeeAvatar}>
                                            {employee.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className={styles.employeeName}>{employee.full_name}</div>
                                            <div className={styles.employeeEmail}>{employee.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div>{employee.position || '—'}</div>
                                    {employee.department && (
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                            {employee.department}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    {employee.role_name ? (
                                        <span 
                                            className={styles.roleBadge}
                                            style={{ backgroundColor: employee.role_color || '#667eea' }}
                                        >
                                            {employee.role_name}
                                        </span>
                                    ) : isAdminRole ? (
                                        <span className={styles.roleBadge} style={{ backgroundColor: '#fbbf24' }}>
                                            Полный доступ
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Без роли</span>
                                    )}
                                </td>
                                <td>{formatDate(employee.created_at)}</td>
                                <td>{formatDate(employee.last_sign_in_at)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => openViewModal(employee)}
                                            className={styles.actionButton}
                                            title="Просмотр информации"
                                        >
                                            <span className="material-icons" style={{ fontSize: '1.25rem' }}>visibility</span>
                                        </button>
                                        <button
                                            onClick={() => handleLoginAsEmployee(employee)}
                                            className={styles.button}
                                            disabled={loggingIn === employee.id}
                                            title="Войти под этим пользователем"
                                            style={{
                                                background: '#dbeafe',
                                                color: '#1d4ed8',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            {loggingIn === employee.id ? (
                                                <>
                                                    <span className="material-icons" style={{ fontSize: '1rem' }}>hourglass_empty</span>
                                                    Работаю...
                                                </>
                                            ) : (
                                                'Войти'
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            )}

            {/* View Employee Modal */}
            {showViewModal && selectedEmployee && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 className={styles.modalTitle} style={{ margin: 0 }}>
                                Информация о сотруднике
                            </h3>
                            <button
                                onClick={() => { setShowViewModal(false); setSelectedEmployee(null); }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.5rem'
                                }}
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className={styles.employeeAvatar} style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                                {selectedEmployee.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedEmployee.full_name}</div>
                                <div style={{ color: '#64748b' }}>{selectedEmployee.email}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#64748b' }}>Должность:</span>
                                <span style={{ fontWeight: 500 }}>{selectedEmployee.position || '—'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#64748b' }}>Отдел:</span>
                                <span style={{ fontWeight: 500 }}>{selectedEmployee.department || '—'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#64748b' }}>Роль:</span>
                                <span>
                                    {selectedEmployee.role_name ? (
                                        <span 
                                            className={styles.roleBadge}
                                            style={{ backgroundColor: selectedEmployee.role_color || '#667eea' }}
                                        >
                                            {selectedEmployee.role_name}
                                        </span>
                                    ) : selectedEmployee.role === 'admin' ? (
                                        <span className={styles.roleBadge} style={{ backgroundColor: '#fbbf24' }}>
                                            Полный доступ
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>Без роли</span>
                                    )}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#64748b' }}>Статус:</span>
                                <span style={{ fontWeight: 500 }}>{selectedEmployee.status || 'Активен'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#64748b' }}>Создан:</span>
                                <span style={{ fontWeight: 500 }}>{formatDate(selectedEmployee.created_at)}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ color: '#64748b' }}>Последний вход:</span>
                                <span style={{ fontWeight: 500 }}>{formatDate(selectedEmployee.last_sign_in_at)}</span>
                            </div>
                        </div>

                        <div className={styles.modalFooter} style={{ marginTop: '1.5rem' }}>
                            <button
                                onClick={() => handleLoginAsEmployee(selectedEmployee)}
                                className={styles.btnPrimary}
                                disabled={loggingIn === selectedEmployee.id}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <span className="material-icons" style={{ fontSize: '1.25rem' }}>
                                    {loggingIn === selectedEmployee.id ? 'hourglass_empty' : 'login'}
                                </span>
                                {loggingIn === selectedEmployee.id ? 'Вход...' : 'Войти под этим пользователем'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
