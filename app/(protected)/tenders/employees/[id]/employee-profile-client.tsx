'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_COLORS } from '@/lib/employees/types';
import { EmployeeFormModal } from '@/components/employees/employee-form-modal';
import { AvatarUploader } from '@/components/employees/AvatarUploader';
import { EmployeeHistory } from '@/components/employees/EmployeeHistory';
import { EmployeeTendersKanban } from '@/components/employees/EmployeeTendersKanban';
import { EmployeeActivityChart } from '@/components/employees/EmployeeActivityChart';
import { EmployeeDocuments } from '@/components/employees/EmployeeDocuments';
import { EmployeeComparison } from '@/components/employees/EmployeeComparison';
import { Button } from '@/components/ui/button';

interface EmployeeProfileClientProps {
  employeeId: string;
}

// Расширенный тип сотрудника с данными роли
interface EmployeeWithRole extends Employee {
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
    permissions: string[];
  } | null;
}

// Тип статистики по тендерам
interface TenderStats {
  total: number;
  won: number;
  lost: number;
  in_progress: number;
  success_rate: number;
  total_nmck: number;
  won_nmck: number;
}

// Тип тендера для списка
interface EmployeeTender {
  id: string;
  number: string;
  name: string;
  status: string;
  nmck: number;
  deadline: string | null;
  created_at: string;
}

// Статусы тендеров
const TENDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  preparation: 'Подготовка',
  submitted: 'Подана',
  consideration: 'Рассмотрение',
  won: 'Выигран',
  lost: 'Проигран',
  cancelled: 'Отменён'
};

const TENDER_STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  preparation: '#f59e0b',
  submitted: '#3b82f6',
  consideration: '#8b5cf6',
  won: '#22c55e',
  lost: '#ef4444',
  cancelled: '#64748b'
};

// Получить название роли
const getRoleName = (employee: EmployeeWithRole): string => {
  if (employee.role_data?.name) {
    return employee.role_data.name;
  }
  return EMPLOYEE_ROLE_LABELS[employee.role] || employee.role;
};

// Получить цвет роли
const getRoleColor = (employee: EmployeeWithRole): string => {
  return employee.role_data?.color || '#3b82f6';
};

// Получить описание роли
const getRoleDescription = (employee: EmployeeWithRole): string => {
  if (employee.role_data?.description) {
    return employee.role_data.description;
  }
  return 'Роль определяет права доступа в системе';
};

// Форматирование суммы
const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount / 100);
};

export function EmployeeProfileClient({ employeeId }: EmployeeProfileClientProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [stats, setStats] = useState<TenderStats | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tenders' | 'kanban' | 'analytics' | 'documents' | 'history'>('info');
  const [tenders, setTenders] = useState<EmployeeTender[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [tenderFilter, setTenderFilter] = useState<string>('all');

  // Загрузка тендеров сотрудника
  const loadTenders = useCallback(async () => {
    try {
      setTendersLoading(true);
      const response = await fetch(`/api/employees/${employeeId}/tenders`);
      if (response.ok) {
        const data = await response.json();
        setTenders(data.tenders || []);
      }
    } catch (err) {
      console.error('Error loading tenders:', err);
    } finally {
      setTendersLoading(false);
    }
  }, [employeeId]);

  // Загрузка статистики по тендерам
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [employeeId]);

  const loadEmployee = useCallback(async () => {
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
  }, [employeeId]);

  useEffect(() => {
    loadEmployee();
    loadStats();
  }, [loadEmployee, loadStats]);

  // Загрузка тендеров при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'tenders') {
      loadTenders();
    }
  }, [activeTab, loadTenders]);

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
          <Button onClick={() => router.push('/tenders/employees')}>← Вернуться</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/tenders/employees')}>← Назад</Button>
          <h1 className="text-3xl font-bold text-gray-900">Профиль сотрудника</h1>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)}>✏️ Редактировать</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Основная информация */}
        <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', flexWrap: 'wrap' }}>
            {/* Аватар */}
            <AvatarUploader
              employeeId={employee.id}
              currentAvatarUrl={employee.avatar_url}
              employeeName={employee.full_name}
              roleColor={getRoleColor(employee)}
              onUpload={(url) => {
                setEmployee({ ...employee, avatar_url: url || undefined });
              }}
            />

            {/* Основные данные */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                {employee.full_name}
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {/* Роль из настроек */}
                <span style={{
                  padding: '0.375rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  background: `${getRoleColor(employee)}20`,
                  color: getRoleColor(employee)
                }}>
                  🔐 {getRoleName(employee)}
                </span>
                {/* Статус */}
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
              {/* Описание роли */}
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                {getRoleDescription(employee)}
              </p>
              {employee.position && (
                <p style={{ fontSize: '1.125rem', color: '#475569', marginBottom: '0.25rem' }}>
                  💼 {employee.position}
                </p>
              )}
              {employee.department && (
                <p style={{ fontSize: '0.9375rem', color: '#94a3b8' }}>
                  🏢 {employee.department}
                </p>
              )}
            </div>

            {/* Быстрые действия */}
            <div className="flex flex-col gap-2">
              <a href={`mailto:${employee.email}`} className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">✉️ Написать</a>
              {employee.phone && <a href={`tel:${employee.phone}`} className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">📞 Позвонить</a>}
              {employee.telegram && <a href={`https://t.me/${employee.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">💬 Telegram</a>}
            </div>
          </div>
        </div>

        {/* Табы */}
        <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1', padding: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { id: 'info', label: '📋 Информация' },
              { id: 'tenders', label: '📊 Тендеры' },
              { id: 'kanban', label: '📌 Канбан' },
              { id: 'analytics', label: '📈 Аналитика' },
              { id: 'documents', label: '📁 Документы' },
              { id: 'history', label: '📜 История' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  padding: '1rem 1.5rem',
                  border: 'none',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  borderBottom: activeTab === tab.id ? `2px solid ${getRoleColor(employee)}` : '2px solid transparent',
                  color: activeTab === tab.id ? '#1e293b' : '#64748b',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Вкладка Информация */}
        {activeTab === 'info' && (
          <>
            {/* Контактная информация */}
            <div className="rounded-lg border bg-card shadow-sm">
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
        <div className="rounded-lg border bg-card shadow-sm">
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
              <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
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
          </>
        )}

        {/* Статистика и список тендеров */}
        {activeTab === 'tenders' && (
          <>
            {/* Статистика */}
            <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                  📊 Статистика по тендерам
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.5rem' }}>Всего</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0c4a6e' }}>{stats?.total || 0}</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#15803d', marginBottom: '0.5rem' }}>Выиграно</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#14532d' }}>{stats?.won || 0}</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginBottom: '0.5rem' }}>Проиграно</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7f1d1d' }}>{stats?.lost || 0}</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#faf5ff', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginBottom: '0.5rem' }}>В работе</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#5b21b6' }}>{stats?.in_progress || 0}</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a16207', marginBottom: '0.5rem' }}>Успех</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#713f12' }}>{stats?.success_rate || 0}%</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginBottom: '0.5rem' }}>НМЦК выиграно</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#064e3b' }}>{formatMoney(stats?.won_nmck || 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Список тендеров */}
            <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                    📋 Список тендеров
                  </h3>
                  <select
                    value={tenderFilter}
                    onChange={(e) => setTenderFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="all">Все тендеры</option>
                    <option value="active">В работе</option>
                    <option value="won">Выигранные</option>
                    <option value="lost">Проигранные</option>
                  </select>
                </div>

                {tendersLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    ⏳ Загрузка тендеров...
                  </div>
                ) : tenders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
                    <p>Нет назначенных тендеров</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tenders
                      .filter(t => {
                        if (tenderFilter === 'all') return true;
                        if (tenderFilter === 'active') return ['draft', 'preparation', 'submitted', 'consideration'].includes(t.status);
                        if (tenderFilter === 'won') return t.status === 'won';
                        if (tenderFilter === 'lost') return t.status === 'lost';
                        return true;
                      })
                      .map(tender => (
                        <a
                          key={tender.id}
                          href={`/tenders/${tender.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: '#f8fafc',
                            borderRadius: '0.75rem',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all 0.2s',
                            border: '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                              {tender.name}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              №{tender.number} • {formatMoney(tender.nmck)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {tender.deadline && (
                              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                📅 {new Date(tender.deadline).toLocaleDateString('ru-RU')}
                              </div>
                            )}
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              background: `${TENDER_STATUS_COLORS[tender.status] || '#94a3b8'}20`,
                              color: TENDER_STATUS_COLORS[tender.status] || '#94a3b8'
                            }}>
                              {TENDER_STATUS_LABELS[tender.status] || tender.status}
                            </span>
                          </div>
                        </a>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Вкладка Канбан */}
        {activeTab === 'kanban' && (
          <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                📌 Канбан тендеров
              </h3>
              <EmployeeTendersKanban employeeId={employee.id} />
            </div>
          </div>
        )}

        {/* Вкладка Аналитика */}
        {activeTab === 'analytics' && (
          <>
            <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                  📈 Активность по месяцам
                </h3>
                <EmployeeActivityChart employeeId={employee.id} />
              </div>
            </div>
            <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                  👥 Сравнение с коллегами
                </h3>
                <EmployeeComparison employeeId={employee.id} companyId={employee.company_id} />
              </div>
            </div>
          </>
        )}

        {/* Вкладка Документы */}
        {activeTab === 'documents' && (
          <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
            <div style={{ padding: '1.5rem' }}>
              <EmployeeDocuments employeeId={employee.id} />
            </div>
          </div>
        )}

        {/* Вкладка История */}
        {activeTab === 'history' && (
          <div className="rounded-lg border bg-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                📜 История изменений
              </h3>
              <EmployeeHistory employeeId={employee.id} />
            </div>
          </div>
        )}
      </div>

      {/* Модалка редактирования */}
      <EmployeeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          loadEmployee();
        }}
        companyId={employee.company_id}
        employee={employee}
        mode="edit"
      />
    </div>
  );
}
