'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';
import { createEmployeeSchema, type CreateEmployeeFormData } from '@/lib/employees/validation';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_STATUS_LABELS } from '@/lib/employees/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  Building2, 
  Shield,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  Save,
} from 'lucide-react';

interface CompanyRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  is_system: boolean;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  employee?: Employee | null;
  mode?: 'create' | 'edit';
}

export function EmployeeFormModal({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  employee = null,
  mode = 'create',
}: EmployeeFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      company_id: companyId,
      role: 'viewer',
      status: 'active',
    },
  });

  const loadCompanyRoles = useCallback(async () => {
    if (!companyId) return;
    setLoadingRoles(true);
    try {
      const response = await fetch(`/api/roles?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, [companyId]);

  const loadDepartments = useCallback(async () => {
    if (!companyId) return;
    try {
      const response = await fetch(`/api/departments?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setDepartments(data || []);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen && companyId) {
      loadCompanyRoles();
      loadDepartments();
    }
  }, [isOpen, companyId, loadCompanyRoles, loadDepartments]);

  useEffect(() => {
    if (mode === 'edit' && employee && isOpen) {
      reset({
        company_id: employee.company_id,
        full_name: employee.full_name,
        email: employee.email,
        phone: employee.phone || undefined,
        telegram: employee.telegram || undefined,
        birth_date: employee.birth_date || undefined,
        position: employee.position || undefined,
        department: employee.department || undefined,
        department_id: employee.department_id || undefined,
        role: employee.role,
        status: employee.status || 'active',
        hire_date: employee.hire_date || undefined,
        work_schedule: employee.work_schedule || undefined,
        notes: employee.notes || undefined,
      });
    } else if (mode === 'create' && isOpen && companyRoles.length > 0) {
      const defaultRole = companyRoles.find(r => r.name === 'Наблюдатель тендеров') || companyRoles[companyRoles.length - 1];
      reset({
        company_id: companyId,
        role_id: defaultRole?.id || null,
        role: defaultRole?.id || 'viewer',
        status: 'active',
      });
    }
  }, [mode, employee, isOpen, reset, companyId, companyRoles]);

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const isRoleUUID = data.role && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.role);
      
      const payload = {
        ...data,
        role_id: isRoleUUID ? data.role : data.role_id,
        create_user_account: createAccount,
      };

      const url = mode === 'edit' && employee 
        ? `/api/employees/${employee.id}` 
        : '/api/employees';
      
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 
          `Ошибка при ${mode === 'edit' ? 'обновлении' : 'создании'} сотрудника`
        );
      }

      reset();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} employee:`, err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoleId = watch('role');
  const selectedRole = companyRoles.find(r => r.id === selectedRoleId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            {mode === 'edit' ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {mode === 'edit' ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Измените данные сотрудника' 
              : 'Заполните информацию о новом сотруднике'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Аватар */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" size="sm">
              Изменить фото
            </Button>
          </div>

          {/* Персональные данные */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Персональные данные
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="full_name" className="text-gray-700">
                  ФИО <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder="Иванов Иван Иванович"
                  className="text-gray-900"
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  <Mail className="h-3 w-3 inline mr-1" />
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="ivan@company.com"
                  className="text-gray-900"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">
                  <Phone className="h-3 w-3 inline mr-1" />
                  Телефон
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+7 (900) 123-45-67"
                  className="text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram" className="text-gray-700">Telegram</Label>
                <Input
                  id="telegram"
                  {...register('telegram')}
                  placeholder="@username"
                  className="text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-gray-700">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Дата рождения
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date')}
                  className="text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Рабочие данные */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Рабочие данные
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position" className="text-gray-700">Должность</Label>
                <Input
                  id="position"
                  {...register('position')}
                  placeholder="Менеджер по тендерам"
                  className="text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  Отдел
                </Label>
                <Select 
                  value={watch('department_id') || 'none'} 
                  onValueChange={(v) => setValue('department_id', v === 'none' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не назначен" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не назначен</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Роль в системе <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={watch('role') || ''} 
                  onValueChange={(v) => setValue('role', v)}
                  disabled={loadingRoles}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRoles ? "Загрузка..." : "Выберите роль"} />
                  </SelectTrigger>
                  <SelectContent>
                    {companyRoles.length > 0 ? (
                      companyRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <span className="flex items-center gap-2">
                            <span 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: role.color }}
                            />
                            {role.name}
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="viewer">Наблюдатель</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedRole?.description && (
                  <p className="text-xs text-gray-500">{selectedRole.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Статус</Label>
                <Select 
                  value={watch('status') || 'active'} 
                  onValueChange={(v) => setValue('status', v as 'active' | 'inactive' | 'vacation' | 'dismissed')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMPLOYEE_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hire_date" className="text-gray-700">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Дата приема
                </Label>
                <Input
                  id="hire_date"
                  type="date"
                  {...register('hire_date')}
                  className="text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_schedule" className="text-gray-700">
                  <Clock className="h-3 w-3 inline mr-1" />
                  График работы
                </Label>
                <Input
                  id="work_schedule"
                  {...register('work_schedule')}
                  placeholder="5/2, 9:00-18:00"
                  className="text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Учетная запись */}
          {mode === 'create' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Учетная запись
              </h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="create_account" 
                  checked={createAccount}
                  onCheckedChange={(checked) => setCreateAccount(checked as boolean)}
                />
                <Label htmlFor="create_account" className="text-gray-700 cursor-pointer">
                  Создать учетную запись для входа в систему
                </Label>
              </div>

              {createAccount && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    Пароль <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="Минимум 8 символов"
                      className="text-gray-900 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Заметки */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Дополнительно
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700">Заметки</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Дополнительная информация о сотруднике..."
                rows={3}
                className="text-gray-900"
              />
            </div>
          </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'edit' ? 'Сохранение...' : 'Создание...'}
                </>
              ) : (
                <>
                  {mode === 'edit' ? <Save className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  {mode === 'edit' ? 'Сохранить' : 'Создать сотрудника'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
