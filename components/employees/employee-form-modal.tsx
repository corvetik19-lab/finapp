'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';
import { createEmployeeSchema, type CreateEmployeeFormData } from '@/lib/employees/validation';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_STATUS_LABELS } from '@/lib/employees/types';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Eye, EyeOff, AlertTriangle } from "lucide-react";

// Тип роли из API
interface CompanyRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  is_system: boolean;
}

// Тип отдела из API
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
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      company_id: companyId,
      role: 'viewer',
      status: 'active',
    },
  });

  // Загрузка ролей компании
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

  // Загрузка отделов компании
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

  // Загружаем роли и отделы при открытии модалки
  useEffect(() => {
    if (isOpen && companyId) {
      loadCompanyRoles();
      loadDepartments();
    }
  }, [isOpen, companyId, loadCompanyRoles, loadDepartments]);

  // Заполняем форму при редактировании
  useEffect(() => {
    if (mode === 'edit' && employee && isOpen) {
      // Используем role_id если есть, иначе role
      const roleValue = employee.role_id || employee.role;
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
        role: roleValue,
        role_id: employee.role_id || undefined,
        status: employee.status || 'active',
        hire_date: employee.hire_date || undefined,
        work_schedule: employee.work_schedule || undefined,
        notes: employee.notes || undefined,
      });
    }
  }, [mode, employee, isOpen, reset]);

  // Устанавливаем дефолтные значения для создания
  useEffect(() => {
    if (mode === 'create' && isOpen && companyRoles.length > 0) {
      // Устанавливаем первую роль по умолчанию (обычно "Наблюдатель тендеров")
      const defaultRole = companyRoles.find(r => r.name === 'Наблюдатель тендеров') || companyRoles[companyRoles.length - 1];
      reset({
        company_id: companyId,
        role_id: defaultRole?.id || null,
        role: defaultRole?.id || 'viewer', // Для обратной совместимости
        status: 'active',
      });
    }
  }, [mode, isOpen, reset, companyId, companyRoles]);

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Если role содержит UUID (новая система), это role_id
      const isRoleUUID = data.role && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.role);
      
      const payload = {
        ...data,
        role_id: isRoleUUID ? data.role : data.role_id, // Если role - это UUID, используем его как role_id
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{mode === 'edit' ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Аватар */}
        <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center"><User className="h-8 w-8 text-muted-foreground" /></div><Button type="button" variant="outline" size="sm">Изменить фото</Button></div>

        {/* Персональные данные */}
        <div className="space-y-4"><h3 className="font-semibold">Персональные данные</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1"><Label>ФИО *</Label><Input {...register('full_name')} placeholder="Иванов Иван Иванович" />{errors.full_name && <p className="text-destructive text-xs">{errors.full_name.message}</p>}</div>
          <div className="space-y-1"><Label>Email *</Label><Input type="email" {...register('email')} placeholder="ivan@company.com" />{errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}</div>
          <div className="space-y-1"><Label>Телефон</Label><Input type="tel" {...register('phone')} placeholder="+7 (900) 123-45-67" /></div>
          <div className="space-y-1"><Label>Telegram</Label><Input {...register('telegram')} placeholder="@username" /></div>
          <div className="space-y-1"><Label>Дата рождения</Label><Input type="date" {...register('birth_date')} /></div>
        </div></div>

        {/* Рабочие данные */}
        <div className="space-y-4"><h3 className="font-semibold">Рабочие данные</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Должность</Label><Input {...register('position')} placeholder="Менеджер по тендерам" /></div>
          <div className="space-y-1"><Label>Отдел</Label><select {...register('department_id')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"><option value="">Не назначен</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="space-y-1"><Label>Роль *</Label><select {...register('role')} disabled={loadingRoles} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">{loadingRoles ? <option>Загрузка...</option> : companyRoles.length > 0 ? companyRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>) : <option value="viewer">Наблюдатель</option>}</select>{errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}{companyRoles.length > 0 && <p className="text-xs text-muted-foreground">{companyRoles.find(r => r.id === watch('role'))?.description || 'Роль определяет права'}</p>}</div>
          <div className="space-y-1"><Label>Статус</Label><select {...register('status')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">{Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="space-y-1"><Label>Дата приёма</Label><Input type="date" {...register('hire_date')} /></div>
          <div className="space-y-1"><Label>График</Label><Input {...register('work_schedule')} placeholder="5/2, 9:00-18:00" /></div>
        </div></div>

        {/* Учётная запись */}
        {mode === 'create' && <div className="space-y-4"><h3 className="font-semibold">Учётная запись</h3><div className="flex items-center gap-2"><Checkbox id="create_account" checked={createAccount} onCheckedChange={v => setCreateAccount(!!v)} /><Label htmlFor="create_account" className="cursor-pointer">Создать учётную запись</Label></div>{createAccount && <div className="space-y-1"><Label>Пароль *</Label><div className="relative"><Input type={showPassword ? 'text' : 'password'} {...register('password')} placeholder="Минимум 8 символов" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}</div>}</div>}

        {/* Заметки */}
        <div className="space-y-1"><Label>Заметки</Label><Textarea {...register('notes')} rows={3} placeholder="Дополнительная информация..." /></div>

        <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Отмена</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{mode === 'edit' ? 'Сохранение...' : 'Создание...'}</> : mode === 'edit' ? 'Сохранить' : 'Создать'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  );
}
