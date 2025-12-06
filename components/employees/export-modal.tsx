'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_ROLE_LABELS } from '@/lib/employees/types';

interface EmployeeWithRole extends Employee {
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
  } | null;
  tenders_count?: number;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeWithRole[];
}

const EXPORT_FIELDS = {
  full_name: 'ФИО',
  email: 'Email',
  phone: 'Телефон',
  position: 'Должность',
  department: 'Отдел',
  role: 'Роль',
  status: 'Статус',
  hire_date: 'Дата найма',
  employee_number: 'Табельный номер',
  tenders_count: 'Кол-во тендеров',
  telegram: 'Telegram',
  birth_date: 'Дата рождения',
};

export function ExportModal({ isOpen, onClose, employees }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(['full_name', 'email', 'phone', 'position', 'role', 'status'])
  );

  const toggleField = (field: string) => {
    const newFields = new Set(selectedFields);
    if (newFields.has(field)) {
      newFields.delete(field);
    } else {
      newFields.add(field);
    }
    setSelectedFields(newFields);
  };

  const getRoleName = (employee: EmployeeWithRole): string => {
    return employee.role_data?.name || EMPLOYEE_ROLE_LABELS[employee.role] || employee.role;
  };

  const handleExport = () => {
    const fields = Array.from(selectedFields);
    const headers = fields.map((f) => EXPORT_FIELDS[f as keyof typeof EXPORT_FIELDS]);

    const rows = employees.map((emp) =>
      fields.map((field) => {
        switch (field) {
          case 'full_name':
            return emp.full_name;
          case 'email':
            return emp.email || '';
          case 'phone':
            return emp.phone || '';
          case 'position':
            return emp.position || '';
          case 'department':
            return emp.department || '';
          case 'role':
            return getRoleName(emp);
          case 'status':
            return EMPLOYEE_STATUS_LABELS[emp.status] || emp.status;
          case 'hire_date':
            return emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('ru-RU') : '';
          case 'employee_number':
            return emp.employee_number || '';
          case 'tenders_count':
            return String(emp.tenders_count || 0);
          case 'telegram':
            return emp.telegram || '';
          case 'birth_date':
            return emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('ru-RU') : '';
          default:
            return '';
        }
      })
    );

    if (format === 'csv') {
      const csvContent = [
        headers.join(';'),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
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
              <tr style="background-color: #3b82f6; color: white; font-weight: bold;">
                ${headers.map((h) => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
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

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5" />
            Экспорт сотрудников
          </DialogTitle>
          <DialogDescription>
            Выберите формат и поля для экспорта
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Формат */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Формат файла</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as 'csv' | 'excel')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer text-foreground">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer text-foreground">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  Excel
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Поля */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Поля для экспорта</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(EXPORT_FIELDS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedFields.has(key)}
                    onCheckedChange={() => toggleField(key)}
                  />
                  <Label htmlFor={key} className="text-sm cursor-pointer text-foreground">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Будет экспортировано: <strong className="text-foreground">{employees.length}</strong> сотрудников
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={selectedFields.size === 0}>
            <Download className="mr-2 h-4 w-4" />
            Экспортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
