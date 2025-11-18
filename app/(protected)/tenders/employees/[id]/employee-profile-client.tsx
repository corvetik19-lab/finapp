'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_COLORS } from '@/lib/employees/types';
import { EmployeeFormModal } from '@/components/employees/employee-form-modal';
import styles from '../../tenders.module.css';

interface EmployeeProfileClientProps {
  employeeId: string;
}

const COMPANY_ID = '74b4c286-ca75-4eb4-9353-4db3d177c939';

export function EmployeeProfileClient({ employeeId }: EmployeeProfileClientProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/employees/${employeeId}`);

      if (!response.ok) {
        throw new Error('Сотрудник не найден');
      }

      const data = await response.json();
      setEmployee(data);
    } catch (err) {
      console.error('Error loading employee:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (loading) {
    return (
      <div className="p-6">
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-6">
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ color: '#ef4444', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            ⚠️ Ошибка
          </div>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'Сотрудник не найден'}</p>
          <button
            onClick={() => router.push('/tenders/employees')}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            ← Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/tenders/employees')}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            ← Назад
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Профиль сотрудника</h1>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          ✏️ Редактировать
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Основная информация */}
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem' }}>
            {/* Аватар */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '3rem',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}>
              {employee.full_name.charAt(0).toUpperCase()}
            </div>

            {/* Основные данные */}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                {employee.full_name}
              </h2>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{
                  padding: '0.375rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  background: '#eff6ff',
                  color: '#1e40af'
                }}>
                  {EMPLOYEE_ROLE_LABELS[employee.role]}
                </span>
                <span style={{
                  padding: '0.375rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  background: `${EMPLOYEE_STATUS_COLORS[employee.status]}20`,
                  color: EMPLOYEE_STATUS_COLORS[employee.status]
                }}>
                  {EMPLOYEE_STATUS_LABELS[employee.status]}
                </span>
              </div>
              {employee.position && (
                <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  {employee.position}
                </p>
              )}
              {employee.department && (
                <p style={{ fontSize: '0.9375rem', color: '#94a3b8' }}>
                  {employee.department}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Контактная информация */}
        <div className={styles.card}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
              📞 Контакты
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Email</div>
                <a href={`mailto:${employee.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                  {employee.email}
                </a>
              </div>
              {employee.phone && (
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Телефон</div>
                  <a href={`tel:${employee.phone}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {employee.phone}
                  </a>
                </div>
              )}
              {employee.telegram && (
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Telegram</div>
                  <a href={`https://t.me/${employee.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {employee.telegram}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Рабочая информация */}
        <div className={styles.card}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
              💼 Рабочие данные
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {employee.employee_number && (
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Табельный номер</div>
                  <div style={{ fontWeight: 500 }}>{employee.employee_number}</div>
                </div>
              )}
              {employee.hire_date && (
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Дата приема</div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(employee.hire_date).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              )}
              {employee.work_schedule && (
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>График работы</div>
                  <div style={{ fontWeight: 500 }}>{employee.work_schedule}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        {(employee.birth_date || employee.notes) && (
          <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                📋 Дополнительно
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {employee.birth_date && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Дата рождения</div>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(employee.birth_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                )}
                {employee.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Заметки</div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#475569' }}>{employee.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Статистика (заглушка) */}
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
              📊 Статистика
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#0369a1', marginBottom: '0.25rem' }}>Назначено тендеров</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0c4a6e' }}>—</div>
              </div>
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#15803d', marginBottom: '0.25rem' }}>Выиграно</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#14532d' }}>—</div>
              </div>
              <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.25rem' }}>Проиграно</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#7f1d1d' }}>—</div>
              </div>
              <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#a16207', marginBottom: '0.25rem' }}>Процент успеха</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#713f12' }}>—</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модалка редактирования */}
      <EmployeeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          loadEmployee();
        }}
        companyId={COMPANY_ID}
        employee={employee}
        mode="edit"
      />
    </div>
  );
}
