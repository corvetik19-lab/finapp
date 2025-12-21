'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Employee {
  id: string;
  full_name: string;
  email?: string;
  position?: string;
  role_data?: {
    name: string;
    color: string;
  } | null;
}

interface Tender {
  id: string;
  purchase_number: string;
  subject: string;
  customer: string;
  stage?: {
    name: string;
    color: string;
  };
}

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tender: Tender | null;
  companyId: string;
}

export function QuickAssignModal({
  isOpen,
  onClose,
  onSuccess,
  tender,
  companyId
}: QuickAssignModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<Set<string>>(new Set());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем список сотрудников и назначений
  useEffect(() => {
    if (isOpen && companyId) {
      loadEmployees();
      loadAssignedEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, companyId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/employees?company_id=${companyId}&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const employeesList = Array.isArray(data) ? data : (data.employees || data.data || []);
        setEmployees(employeesList);
      } else {
        throw new Error('Ошибка загрузки сотрудников');
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем список сотрудников которые уже назначены на тендеры
  const loadAssignedEmployees = async () => {
    try {
      const response = await fetch(`/api/tenders/assigned-employees?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        const assignedIds = new Set<string>(data.employee_ids || []);
        setAssignedEmployeeIds(assignedIds);
      }
    } catch (err) {
      console.error('Error loading assigned employees:', err);
    }
  };

  // Фильтруем только свободных сотрудников (не назначенных на тендеры)
  const availableEmployees = employees.filter(emp => !assignedEmployeeIds.has(emp.id));

  const handleAssign = async () => {
    if (!tender || !selectedEmployeeId) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/tenders/${tender.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedEmployeeId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка назначения');
      }

      onSuccess();
      onClose();
      setSelectedEmployeeId('');
    } catch (err) {
      console.error('Error assigning tender:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при назначении тендера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (!tender) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/tenders/${tender.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: null })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка освобождения');
      }

      onSuccess();
      onClose();
      setSelectedEmployeeId('');
    } catch (err) {
      console.error('Error unassigning tender:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при освобождении тендера');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tender) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Назначить сотрудника
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Информация о тендере */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Номер закупки</span>
              <span className="font-medium">{tender.purchase_number}</span>
            </div>
            <div className="text-sm text-gray-700 line-clamp-2">{tender.subject}</div>
            {tender.stage && (
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: tender.stage.color,
                  color: tender.stage.color 
                }}
              >
                {tender.stage.name}
              </Badge>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Выбор сотрудника */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Выберите сотрудника
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select 
                value={selectedEmployeeId} 
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.length === 0 ? (
                    <div className="py-4 px-2 text-center text-sm text-gray-500">
                      Все сотрудники уже назначены на тендеры
                    </div>
                  ) : availableEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{employee.full_name}</span>
                        {employee.role_data && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: employee.role_data.color ? `${employee.role_data.color}20` : '#6366f120',
                              color: employee.role_data.color || '#6366f1'
                            }}
                          >
                            {employee.role_data.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleUnassign}
            disabled={submitting}
          >
            Освободить тендер
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedEmployeeId || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Назначение...
              </>
            ) : (
              'Назначить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
