'use client';

import Link from 'next/link';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_STATUS_LABELS } from '@/lib/employees/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Mail, Phone, Briefcase } from 'lucide-react';

interface EmployeeWithRole extends Employee {
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
  } | null;
  tenders_count?: number;
}

interface EmployeesCardsProps {
  employees: EmployeeWithRole[];
  onEdit: (employee: EmployeeWithRole) => void;
  onDelete: (id: string) => void;
}

export function EmployeesCards({ employees, onEdit, onDelete }: EmployeesCardsProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleName = (employee: EmployeeWithRole): string => {
    return employee.role_data?.name || employee.role || 'Без роли';
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active': return 'default';
      case 'vacation': return 'secondary';
      case 'sick_leave': return 'secondary';
      case 'fired': return 'destructive';
      default: return 'outline';
    }
  };

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium mb-2">Нет сотрудников</p>
        <p className="text-sm">Добавьте первого сотрудника</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {employees.map((employee) => (
        <Card key={employee.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
          <CardHeader className="pb-3">
            {/* Верхняя строка: аватар и меню */}
            <div className="flex items-start justify-between gap-2">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(employee)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(employee.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Имя и статус */}
            <div className="mt-3 space-y-1.5">
              <Link
                href={`/tenders/employees/${employee.id}`}
                className="font-semibold text-primary hover:underline block truncate text-base"
                title={employee.full_name}
              >
                {employee.full_name}
              </Link>
              <Badge variant={getStatusVariant(employee.status)} className="text-xs">
                {EMPLOYEE_STATUS_LABELS[employee.status] || employee.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            {/* Роль */}
            <div>
              <Badge
                variant="outline"
                className="max-w-full"
                style={{
                  borderColor: employee.role_data?.color || '#3b82f6',
                  color: employee.role_data?.color || '#3b82f6',
                }}
              >
                <span className="truncate">{getRoleName(employee)}</span>
              </Badge>
              {employee.role_data?.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {employee.role_data.description}
                </p>
              )}
            </div>

            {/* Должность */}
            {employee.position && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{employee.position}</span>
              </div>
            )}

            {/* Контакты */}
            <div className="space-y-1.5 flex-1">
              {employee.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={employee.email}>{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{employee.phone}</span>
                </div>
              )}
            </div>

            {/* Тендеры */}
            {employee.tenders_count !== undefined && employee.tenders_count > 0 && (
              <div className="pt-2 border-t mt-auto">
                <span className="text-xs text-muted-foreground">
                  Тендеров: <strong>{employee.tenders_count}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
