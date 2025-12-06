'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Employee, EmployeeFilters, EmployeeStats } from '@/lib/employees/types';
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_COLORS } from '@/lib/employees/types';
import { EmployeeFormModal } from '@/components/employees/employee-form-modal';
// Reusable styles
const cardStyle = "bg-white rounded-xl border shadow-sm";
const btnPrimary = "px-4 py-2 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-2";
const btnSecondary = "px-4 py-2 rounded-lg font-semibold text-sm bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center gap-2";

// Тип представления
type ViewMode = 'table' | 'cards';

// Тип сортировки
type SortField = 'full_name' | 'created_at' | 'hire_date' | 'status' | 'tenders_count';
type SortOrder = 'asc' | 'desc';

// Тип роли компании
interface CompanyRole {
  id: string;
  name: string;
  description: string;
  color: string;
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
  tenders_count?: number;
}

interface EmployeesListClientProps {
  companyId: string;
}

// Получить название роли (из role_data или захардкоженных меток)
const getRoleName = (employee: EmployeeWithRole): string => {
  if (employee.role_data?.name) {
    return employee.role_data.name;
  }
  return EMPLOYEE_ROLE_LABELS[employee.role] || employee.role;
};

// Получить описание роли
const getRoleDescription = (employee: EmployeeWithRole): string => {
  if (employee.role_data?.description) {
    return employee.role_data.description;
  }
  // Fallback для старых ролей
  switch (employee.role) {
    case 'admin':
      return 'Полный доступ к управлению компанией и сотрудниками';
    case 'manager':
      return 'Управление тендерами, задачами и аналитикой';
    case 'tender_specialist':
      return 'Работа с тендерами, подготовка документации';
    case 'accountant':
      return 'Просмотр финансов и реестра оплат';
    case 'logistics':
      return 'Управление логистикой и отправками';
    case 'viewer':
      return 'Только просмотр информации';
    default:
      return 'Ограниченный доступ';
  }
};

// Получить цвет роли
const getRoleColor = (employee: EmployeeWithRole): string => {
  return employee.role_data?.color || '#3b82f6';
};

export function EmployeesListClient({ companyId }: EmployeesListClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [employees, setEmployees] = useState<EmployeeWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Инициализация фильтров из URL
  const [filters, setFilters] = useState<EmployeeFilters>(() => ({
    search: searchParams.get('search') || undefined,
    role: (searchParams.get('role') as EmployeeFilters['role']) || undefined,
    status: (searchParams.get('status') as EmployeeFilters['status']) || undefined,
    department: searchParams.get('department') || undefined,
    hire_date_from: searchParams.get('hire_date_from') || undefined,
    hire_date_to: searchParams.get('hire_date_to') || undefined,
  }));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRole | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Новое состояние для Фазы 2 (с сохранением в localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('employees_view_mode') as ViewMode) || 'table';
    }
    return 'table';
  });
  const [sortField, setSortField] = useState<SortField>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('employees_sort_field') as SortField) || 'created_at';
    }
    return 'created_at';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('employees_sort_order') as SortOrder) || 'desc';
    }
    return 'desc';
  });
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Сохранение настроек в localStorage
  useEffect(() => {
    localStorage.setItem('employees_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('employees_sort_field', sortField);
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem('employees_sort_order', sortOrder);
  }, [sortOrder]);

  // Синхронизация фильтров с URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    if (filters.department) params.set('department', filters.department);
    if (filters.hire_date_from) params.set('hire_date_from', filters.hire_date_from);
    if (filters.hire_date_to) params.set('hire_date_to', filters.hire_date_to);
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, pathname, router]);
  
  // Фаза 4: Массовые действия
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState<'status' | 'role' | false>(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/employees?company_id=${companyId}&stats=true`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [companyId]);

  // Загрузка ролей компании для фильтра
  const loadCompanyRoles = useCallback(async () => {
    try {
      const response = await fetch(`/api/roles?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  }, [companyId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        company_id: companyId,
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.department && { department: filters.department }),
        ...(filters.hire_date_from && { hire_date_from: filters.hire_date_from }),
        ...(filters.hire_date_to && { hire_date_to: filters.hire_date_to }),
      });

      const response = await fetch(`/api/employees?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки сотрудников');
      }

      const data = await response.json();
      
      // Сортировка на клиенте
      const sortedData = [...(data || [])];
      sortedData.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (sortField === 'full_name') {
          valA = valA?.toLowerCase() || '';
          valB = valB?.toLowerCase() || '';
        }
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      
      setEmployees(sortedData);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при монтировании
  useEffect(() => {
    loadStats();
    loadCompanyRoles();
  }, [loadStats, loadCompanyRoles]);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortField, sortOrder]);
  
  // Получить уникальные отделы для фильтра
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

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

  // Фаза 4: Функции массовых действий
  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Изменить статус ${selectedIds.size} сотрудников на "${EMPLOYEE_STATUS_LABELS[newStatus as keyof typeof EMPLOYEE_STATUS_LABELS]}"?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );
      
      await Promise.all(promises);
      setSelectedIds(new Set());
      setShowBulkActions(false);
      loadEmployees();
      loadStats();
    } catch (err) {
      console.error('Bulk status change error:', err);
      alert('Ошибка при изменении статуса');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRoleChange = async (newRoleId: string) => {
    if (selectedIds.size === 0) return;
    
    const roleName = companyRoles.find(r => r.id === newRoleId)?.name || newRoleId;
    if (!confirm(`Изменить роль ${selectedIds.size} сотрудников на "${roleName}"?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_id: newRoleId }),
        })
      );
      
      await Promise.all(promises);
      setSelectedIds(new Set());
      setShowBulkActions(false);
      loadEmployees();
    } catch (err) {
      console.error('Bulk role change error:', err);
      alert('Ошибка при изменении роли');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Удалить ${selectedIds.size} сотрудников? Это действие нельзя отменить.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/employees/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      setSelectedIds(new Set());
      setShowBulkActions(false);
      loadEmployees();
      loadStats();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Ошибка при удалении');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Модалка выбора полей для экспорта
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFields, setExportFields] = useState<Record<string, boolean>>({
    full_name: true,
    email: true,
    phone: true,
    position: true,
    department: true,
    role: true,
    status: true,
    hire_date: true,
    employee_number: true,
    tenders_count: false,
    telegram: false,
    birth_date: false,
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  const EXPORT_FIELD_LABELS: Record<string, string> = {
    full_name: 'ФИО',
    email: 'Email',
    phone: 'Телефон',
    position: 'Должность',
    department: 'Отдел',
    role: 'Роль',
    status: 'Статус',
    hire_date: 'Дата приёма',
    employee_number: 'Табельный номер',
    tenders_count: 'Кол-во тендеров',
    telegram: 'Telegram',
    birth_date: 'Дата рождения',
  };

  const handleExportWithFields = () => {
    const selectedFields = Object.entries(exportFields)
      .filter(([, selected]) => selected)
      .map(([field]) => field);

    const headers = selectedFields.map(f => EXPORT_FIELD_LABELS[f]);
    
    const rows = employees.map(emp => selectedFields.map(field => {
      switch (field) {
        case 'full_name': return emp.full_name;
        case 'email': return emp.email;
        case 'phone': return emp.phone || '';
        case 'position': return emp.position || '';
        case 'department': return emp.department || '';
        case 'role': return getRoleName(emp);
        case 'status': return EMPLOYEE_STATUS_LABELS[emp.status];
        case 'hire_date': return emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('ru-RU') : '';
        case 'employee_number': return emp.employee_number || '';
        case 'tenders_count': return String(emp.tenders_count || 0);
        case 'telegram': return emp.telegram || '';
        case 'birth_date': return emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('ru-RU') : '';
        default: return '';
      }
    }));

    if (exportFormat === 'csv') {
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead>
              <tr style="background-color: #667eea; color: white; font-weight: bold;">
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
  };

  // Фаза 5: Приглашение по email (показать модалку)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      alert('Введите email');
      return;
    }

    if (!inviteRole) {
      alert('Выберите роль');
      return;
    }

    setInviteSending(true);
    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role_id: inviteRole,
          company_id: companyId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка отправки приглашения');
      }

      alert(`Приглашение отправлено на ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('');
    } catch (err) {
      console.error('Invite error:', err);
      alert(err instanceof Error ? err.message : 'Ошибка отправки приглашения');
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Сотрудники</h1>
          <p className="text-gray-600 mt-1">
            Управление сотрудниками и их ролями
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowExportModal(true)}
            className={`${btnSecondary}`}
            title="Экспорт данных"
          >
            📥 Экспорт
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className={`${btnSecondary}`}
            title="Пригласить по email"
          >
            ✉️ Пригласить
          </button>
          <button
            onClick={handleAddEmployee}
            className={`${btnPrimary}`}
          >
            ➕ Добавить
          </button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className={cardStyle} style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{stats.total}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Всего сотрудников</div>
          </div>
          <div className={cardStyle} style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{stats.by_status?.active || 0}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Активных</div>
          </div>
          <div className={cardStyle} style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.by_status?.vacation || 0}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>В отпуске</div>
          </div>
          <div className={cardStyle} style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>{Object.keys(stats.by_department || {}).length}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Отделов</div>
          </div>
        </div>
      )}

      {/* Панель управления: вид, сортировка, фильтры */}
      <div className={cardStyle} style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Переключатель вида */}
          <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: viewMode === 'table' ? 'white' : 'transparent',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: viewMode === 'table' ? 600 : 400
              }}
            >
              📋 Таблица
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: viewMode === 'cards' ? 'white' : 'transparent',
                boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: viewMode === 'cards' ? 600 : 400
              }}
            >
              🃏 Карточки
            </button>
          </div>

          {/* Сортировка */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Сортировка:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value="created_at">По дате добавления</option>
              <option value="full_name">По имени</option>
              <option value="hire_date">По дате найма</option>
              <option value="status">По статусу</option>
              <option value="tenders_count">По кол-ву тендеров</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: 'white',
                cursor: 'pointer'
              }}
              title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Кнопка доп. фильтров */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              background: showFilters ? '#eff6ff' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🔽 Фильтры {Object.values(filters).filter(Boolean).length > 0 && `(${Object.values(filters).filter(Boolean).length})`}
          </button>
        </div>

        {/* Расширенные фильтры */}
        {showFilters && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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
                {companyRoles.length > 0 ? (
                  companyRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                ) : (
                  Object.entries(EMPLOYEE_ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))
                )}
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
              <select
                value={filters.department || ''}
                onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
                style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value="">Все отделы</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', whiteSpace: 'nowrap' }}>Приём с:</span>
                <input
                  type="date"
                  value={filters.hire_date_from || ''}
                  onChange={(e) => setFilters({ ...filters, hire_date_from: e.target.value || undefined })}
                  style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', whiteSpace: 'nowrap' }}>по:</span>
                <input
                  type="date"
                  value={filters.hire_date_to || ''}
                  onChange={(e) => setFilters({ ...filters, hire_date_to: e.target.value || undefined })}
                  style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', flex: 1 }}
                />
              </div>
            </div>
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={() => setFilters({})}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#ef4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✕ Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>

      {/* Панель массовых действий */}
      {selectedIds.size > 0 && (
        <div className={cardStyle} style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600 }}>
              ✅ Выбрано: {selectedIds.size} из {employees.length}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '0.25rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              ✕ Снять выбор
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Изменить статус */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowBulkActions(showBulkActions === 'status' ? false : 'status')}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
                disabled={bulkActionLoading}
              >
                📊 Изменить статус
              </button>
              {showBulkActions === 'status' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  background: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  minWidth: '150px'
                }}>
                  {Object.entries(EMPLOYEE_STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleBulkStatusChange(key)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem 1rem',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#1e293b',
                        fontSize: '0.875rem'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Изменить роль */}
            {companyRoles.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowBulkActions(showBulkActions === 'role' ? false : 'role')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                  disabled={bulkActionLoading}
                >
                  🔐 Изменить роль
                </button>
                {showBulkActions === 'role' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '0.25rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10,
                    minWidth: '180px'
                  }}>
                    {companyRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleBulkRoleChange(role.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          padding: '0.5rem 1rem',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#1e293b',
                          fontSize: '0.875rem'
                        }}
                      >
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: role.color 
                        }} />
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Удалить */}
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '0.5rem 1rem',
                background: '#ef4444',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
              disabled={bulkActionLoading}
            >
              🗑️ Удалить
            </button>
          </div>
        </div>
      )}

      {/* Контент */}
      <div className={cardStyle}>
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
              className={`${btnPrimary}`}
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
              className={`${btnPrimary}`}
            >
              ➕ Добавить сотрудника
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* Режим карточек */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', padding: '1rem' }}>
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={cardStyle}
                style={{
                  padding: '1.25rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {/* Заголовок карточки */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: getRoleColor(employee),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}>
                    {employee.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <a
                      href={`/tenders/employees/${employee.id}`}
                      style={{
                        fontWeight: 600,
                        fontSize: '1.125rem',
                        color: '#1e293b',
                        textDecoration: 'none'
                      }}
                    >
                      {employee.full_name}
                    </a>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {employee.position || 'Должность не указана'}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    background: `${EMPLOYEE_STATUS_COLORS[employee.status]}20`,
                    color: EMPLOYEE_STATUS_COLORS[employee.status]
                  }}>
                    {EMPLOYEE_STATUS_LABELS[employee.status]}
                  </span>
                </div>

                {/* Роль */}
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: `${getRoleColor(employee)}15`,
                    color: getRoleColor(employee),
                    display: 'inline-block'
                  }}>
                    🔐 {getRoleName(employee)}
                  </span>
                </div>

                {/* Контакты */}
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    ✉️ {employee.email}
                  </div>
                  {employee.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      📞 {employee.phone}
                    </div>
                  )}
                  {employee.department && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🏢 {employee.department}
                    </div>
                  )}
                </div>

                {/* Действия */}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <a
                    href={`/tenders/employees/${employee.id}`}
                    className={`${btnSecondary}`}
                    style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', padding: '0.5rem' }}
                  >
                    👁️ Профиль
                  </a>
                  <button
                    onClick={() => handleEditEmployee(employee)}
                    className={`${btnPrimary}`}
                    style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                  >
                    ✏️ Изменить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Режим таблицы */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === employees.length && employees.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      title="Выбрать всех"
                    />
                  </th>
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
                    Роль и доступ
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
                  <tr 
                    key={employee.id} 
                    style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      background: selectedIds.has(employee.id) ? '#f0f9ff' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '1rem', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(employee.id)}
                        onChange={() => toggleSelectOne(employee.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: getRoleColor(employee),
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
                      <div>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: `${getRoleColor(employee)}20`,
                          color: getRoleColor(employee),
                          display: 'inline-block',
                          marginBottom: '0.25rem'
                        }}>
                          {getRoleName(employee)}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '200px', lineHeight: '1.2' }}>
                          {getRoleDescription(employee)}
                        </div>
                      </div>
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
                        className={`${btnSecondary}`}
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
        companyId={companyId}
        employee={editingEmployee}
        mode={modalMode}
      />

      {/* Модалка приглашения */}
      {showInviteModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div 
            className={cardStyle}
            style={{
              width: '100%',
              maxWidth: '450px',
              padding: 0,
              margin: '1rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                ✉️ Пригласить сотрудника
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Отправьте приглашение на email. Сотрудник получит ссылку для регистрации в системе.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                  Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@company.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                  Роль <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Выберите роль</option>
                  {companyRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {inviteRole && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                    💡 {companyRoles.find(r => r.id === inviteRole)?.description || 'Роль определяет права доступа'}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className={`${btnSecondary}`}
                  disabled={inviteSending}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSendInvite}
                  className={`${btnPrimary}`}
                  disabled={inviteSending || !inviteEmail || !inviteRole}
                >
                  {inviteSending ? '⏳ Отправка...' : '📧 Отправить приглашение'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка выбора полей для экспорта */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              📥 Экспорт сотрудников
            </h2>

            {/* Формат */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Формат файла
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                  />
                  CSV
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    checked={exportFormat === 'excel'}
                    onChange={() => setExportFormat('excel')}
                  />
                  Excel
                </label>
              </div>
            </div>

            {/* Поля */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Выберите поля для экспорта
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '0.5rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '0.5rem'
              }}>
                {Object.entries(EXPORT_FIELD_LABELS).map(([field, label]) => (
                  <label 
                    key={field} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={exportFields[field] || false}
                      onChange={(e) => setExportFields({
                        ...exportFields,
                        [field]: e.target.checked
                      })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setExportFields(Object.fromEntries(
                    Object.keys(EXPORT_FIELD_LABELS).map(k => [k, true])
                  ))}
                  style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={() => setExportFields(Object.fromEntries(
                    Object.keys(EXPORT_FIELD_LABELS).map(k => [k, false])
                  ))}
                  style={{ fontSize: '0.75rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Снять все
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExportModal(false)}
                className={`${btnSecondary}`}
              >
                Отмена
              </button>
              <button
                onClick={handleExportWithFields}
                className={`${btnPrimary}`}
                disabled={!Object.values(exportFields).some(Boolean)}
              >
                📥 Экспортировать ({employees.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
