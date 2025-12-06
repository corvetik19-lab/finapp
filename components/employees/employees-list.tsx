'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Employee, EmployeeStats } from '@/lib/employees/types';
import { EmployeesHeader } from './employees-header';
import { EmployeesTable } from './employees-table';
import { EmployeesCards } from './employees-cards';
import { EmployeeFormModal } from './employee-form-modal-new';
import { ExportModal } from './export-modal';
import { InviteModal } from './invite-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface EmployeeWithRole extends Employee {
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
  } | null;
  tenders_count?: number;
}

interface EmployeesListProps {
  companyId: string;
}

export function EmployeesList({ companyId }: EmployeesListProps) {
  const [employees, setEmployees] = useState<EmployeeWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchValue, setSearchValue] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRole | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Загрузка данных
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        company_id: companyId,
        sort_by: sortField,
        sort_order: sortOrder,
      });

      // Загружаем сотрудников и статистику параллельно
      const [employeesRes, statsRes] = await Promise.all([
        fetch(`/api/employees?${params}`),
        fetch(`/api/employees?company_id=${companyId}&stats=true`),
      ]);

      if (!employeesRes.ok) throw new Error('Ошибка загрузки');

      const employeesData = await employeesRes.json();
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [companyId, sortField, sortOrder]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Handlers
  const handleAdd = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEdit = (employee: EmployeeWithRole) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить сотрудника?')) return;

    try {
      const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
      await loadEmployees();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Ошибка удаления');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    loadEmployees();
  };

  // Фильтрация по поиску (клиентская)
  const filteredEmployees = employees.filter((emp) => {
    if (!searchValue) return true;
    const search = searchValue.toLowerCase();
    return (
      emp.full_name.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.position?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <EmployeesHeader
        stats={stats || undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={setSortField}
        onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        onAddClick={handleAdd}
        onExportClick={() => setIsExportOpen(true)}
        onInviteClick={() => setIsInviteOpen(true)}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Контент */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : viewMode === 'table' ? (
        <Card>
          <EmployeesTable
            employees={filteredEmployees}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onToggleSelect={handleToggleSelect}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Card>
      ) : (
        <EmployeesCards
          employees={filteredEmployees}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Модалка формы */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        companyId={companyId}
        employee={editingEmployee || undefined}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* Модалка экспорта */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        employees={filteredEmployees}
      />

      {/* Модалка приглашения */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        companyId={companyId}
      />
    </div>
  );
}
