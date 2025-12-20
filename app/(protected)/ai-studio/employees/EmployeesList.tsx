"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  UserCog, 
  Plus, 
  Mail, 
  Phone, 
  MoreVertical,
  Search,
  Filter,
  Pencil,
  Trash2,
  UserPlus,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal-new";
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_STATUS_LABELS } from "@/lib/employees/types";

interface EmployeeWithRole {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  role: string;
  status: string;
  avatar_url?: string;
  hire_date?: string;
  created_at: string;
  role_id?: string;
  company_id: string;
  updated_at?: string;
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
    permissions: string[];
  } | null;
  roles?: {
    id: string;
    name: string;
    color?: string;
  };
}

interface EmployeesListProps {
  employees: EmployeeWithRole[];
  companyId: string;
  organizationName: string;
}

export default function EmployeesList({ 
  employees: initialEmployees, 
  companyId,
  organizationName 
}: EmployeesListProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithRole[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRole | null>(null);
  const [modalMode, setModalMode] = useState<"edit" | "create">("create");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setLoading] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data || []);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.full_name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.position?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query)
    );
  });

  const handleEdit = (employee: EmployeeWithRole) => {
    setSelectedEmployee(employee);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedEmployee(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSuccess = () => {
    loadEmployees();
    router.refresh();
  };

  const handleDeleteClick = (employee: EmployeeWithRole) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadEmployees();
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка удаления');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Ошибка удаления сотрудника');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleName = (employee: EmployeeWithRole): string => {
    if (employee.role_data?.name) {
      return employee.role_data.name;
    }
    if (employee.roles?.name) {
      return employee.roles.name;
    }
    return EMPLOYEE_ROLE_LABELS[employee.role as keyof typeof EMPLOYEE_ROLE_LABELS] || employee.role;
  };

  const getRoleColor = (employee: EmployeeWithRole): string => {
    return employee.role_data?.color || employee.roles?.color || '#a78bfa';
  };

  const getStatusBadge = (status: string) => {
    const label = EMPLOYEE_STATUS_LABELS[status as keyof typeof EMPLOYEE_STATUS_LABELS] || status;
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-700 border-green-200">{label}</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{label}</Badge>;
      case 'vacation': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{label}</Badge>;
      case 'dismissed': return <Badge className="bg-red-100 text-red-700 border-red-200">{label}</Badge>;
      default: return <Badge variant="outline">{label}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-purple-500" />
            Сотрудники
          </h1>
          <p className="text-muted-foreground">
            Управление сотрудниками организации «{organizationName}»
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/settings/users">
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Пригласить пользователя
            </Button>
          </Link>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Поиск по имени, email или должности..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employees list */}
      <Card>
        <CardHeader>
          <CardTitle>Список сотрудников</CardTitle>
          <CardDescription>
            Всего сотрудников: {filteredEmployees.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "Ничего не найдено" : "Нет сотрудников"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "Попробуйте изменить поисковый запрос"
                  : "Добавьте первого сотрудника для начала работы"
                }
              </p>
              {!searchQuery && (
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить сотрудника
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.avatar_url} />
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{employee.full_name}</h4>
                        {getStatusBadge(employee.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {employee.position || 'Должность не указана'}
                        {employee.department && ` • ${employee.department}`}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </span>
                        {employee.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge 
                        className="border"
                        style={{ 
                          backgroundColor: `${getRoleColor(employee)}20`,
                          color: getRoleColor(employee),
                          borderColor: `${getRoleColor(employee)}40`
                        }}
                      >
                        {getRoleName(employee)}
                      </Badge>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Добавлен</p>
                      <p>{formatDate(employee.created_at)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(employee)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteClick(employee)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        companyId={companyId}
        employee={selectedEmployee}
        mode={modalMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить сотрудника{" "}
              <strong>{employeeToDelete?.full_name}</strong>? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
