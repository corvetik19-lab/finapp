'use client';

import Link from 'next/link';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_STATUS_LABELS } from '@/lib/employees/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Mail, Phone, Circle } from 'lucide-react';
import { isUserOnline, formatLastSeen } from '@/hooks/useOnlineStatus';

interface EmployeeWithRole extends Employee {
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
  } | null;
  tenders_count?: number;
  last_seen_at?: string | null;
}

interface EmployeesTableProps {
  employees: EmployeeWithRole[];
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onEdit: (employee: EmployeeWithRole) => void;
  onDelete: (id: string) => void;
}

export function EmployeesTable({
  employees,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
}: EmployeesTableProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedIds.size === employees.length && employees.length > 0}
              onCheckedChange={onSelectAll}
            />
          </TableHead>
          <TableHead>Сотрудник</TableHead>
          <TableHead className="w-24">Онлайн</TableHead>
          <TableHead>Контакты</TableHead>
          <TableHead>Должность</TableHead>
          <TableHead>Роль</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id} className={selectedIds.has(employee.id) ? 'bg-muted/50' : ''}>
            <TableCell>
              <Checkbox
                checked={selectedIds.has(employee.id)}
                onCheckedChange={() => onToggleSelect(employee.id)}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Link
                  href={`/tenders/employees/${employee.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {employee.full_name}
                </Link>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Circle
                  className={`h-2.5 w-2.5 ${isUserOnline(employee.last_seen_at || null) ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`}
                />
                <span className={`text-xs ${isUserOnline(employee.last_seen_at || null) ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                  {formatLastSeen(employee.last_seen_at || null)}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                {employee.email && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{employee.phone}</span>
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">{employee.position || '—'}</span>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  style={{
                    borderColor: employee.role_data?.color || '#3b82f6',
                    color: employee.role_data?.color || '#3b82f6',
                  }}
                >
                  {getRoleName(employee)}
                </Badge>
                {employee.role_data?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {employee.role_data.description}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(employee.status)}>
                {EMPLOYEE_STATUS_LABELS[employee.status] || employee.status}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
