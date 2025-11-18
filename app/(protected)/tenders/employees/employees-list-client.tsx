'use client';

import { useState, useEffect } from 'react';
import type { Employee, EmployeeFilters } from '@/lib/employees/types';
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_COLORS } from '@/lib/employees/types';
import { EmployeeFormModal } from '@/components/employees/employee-form-modal';
import styles from '../tenders.module.css';

// TODO: Получить company_id из контекста пользователя
const COMPANY_ID = '74b4c286-ca75-4eb4-9353-4db3d177c939';

export function EmployeesListClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        company_id: COMPANY_ID,
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`/api/employees?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки сотрудников');
      }

      const data = await response.json();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleAddEmployee = () => {
    setModalMode('create');
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setModalMode('edit');
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Сотрудники</h1>
          <p className="text-gray-600 mt-1">
            Управление сотрудниками и их ролями
          </p>
        </div>
        <button
          onClick={handleAddEmployee}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          ➕ Добавить сотрудника
        </button>
      </div>

      {/* Фильтры */}
      <div className={styles.card} style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <input
            type="text"
            placeholder="🔍 Поиск по имени, email, телефону..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
          <select
            value={filters.role || ''}
            onChange={(e) => setFilters({ ...filters, role: (e.target.value || undefined) as typeof filters.role })}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="">Все роли</option>
            {Object.entries(EMPLOYEE_ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as typeof filters.status })}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="">Все статусы</option>
            {Object.entries(EMPLOYEE_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Контент */}
      <div className={styles.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ color: '#ef4444', fontSize: '1.125rem', marginBottom: '0.5rem' }}>⚠️ Ошибка</div>
            <p style={{ color: '#64748b' }}>{error}</p>
            <button
              onClick={loadEmployees}
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ marginTop: '1rem' }}
            >
              Попробовать снова
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
              Нет сотрудников
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Добавьте первого сотрудника, чтобы начать работу
            </p>
            <button
              onClick={handleAddEmployee}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              ➕ Добавить сотрудника
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                    Сотрудник
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                    Контакты
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                    Должность
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                    Роль
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                    Статус
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '1.125rem'
                        }}>
                          {employee.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <a
                            href={`/tenders/employees/${employee.id}`}
                            style={{
                              fontWeight: 600,
                              color: '#1e293b',
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#1e293b'}
                          >
                            {employee.full_name}
                          </a>
                          {employee.employee_number && (
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              №{employee.employee_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ color: '#1e293b' }}>{employee.email}</div>
                        {employee.phone && (
                          <div style={{ color: '#64748b' }}>{employee.phone}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                        {employee.position || '—'}
                      </div>
                      {employee.department && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {employee.department}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: '#eff6ff',
                        color: '#1e40af'
                      }}>
                        {EMPLOYEE_ROLE_LABELS[employee.role]}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: `${EMPLOYEE_STATUS_COLORS[employee.status]}20`,
                        color: EMPLOYEE_STATUS_COLORS[employee.status]
                      }}>
                        {EMPLOYEE_STATUS_LABELS[employee.status]}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                      >
                        ✏️ Редактировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка добавления/редактирования сотрудника */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={() => {
          handleCloseModal();
          loadEmployees();
        }}
        companyId={COMPANY_ID}
        employee={editingEmployee}
        mode={modalMode}
      />
    </div>
  );
}
