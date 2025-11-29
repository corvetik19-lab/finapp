'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';
import { createEmployeeSchema, type CreateEmployeeFormData } from '@/lib/employees/validation';
import type { Employee } from '@/lib/employees/types';
import { EMPLOYEE_STATUS_LABELS } from '@/lib/employees/types';
import styles from './employee-form-modal.module.css';

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
      // Устанавливаем первую роль по умолчанию (обычно "Наблюдатель тендеров")
      const defaultRole = companyRoles.find(r => r.name === 'Наблюдатель тендеров') || companyRoles[companyRoles.length - 1];
      reset({
        company_id: companyId,
        role_id: defaultRole?.id || null,
        role: defaultRole?.id || 'viewer', // Для обратной совместимости
        status: 'active',
      });
    }
  }, [mode, employee, isOpen, reset, companyId, companyRoles]);

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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'edit' ? '✏️ Редактировать сотрудника' : '➕ Добавить сотрудника'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.content}>
            {error && (
              <div className={styles.errorAlert}>
                <span className={styles.errorIcon}>⚠️</span>
                {error}
              </div>
            )}

            {/* Аватар */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarPlaceholder}>
                <span className={styles.avatarIcon}>👤</span>
              </div>
              <button type="button" className={styles.avatarButton}>
                📷 Изменить фото
              </button>
            </div>

            {/* Персональные данные */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Персональные данные</h3>
              <div className={styles.grid}>
                {/* ФИО */}
                <div className={styles.fieldFull}>
                  <label className={styles.label}>
                    ФИО <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    {...register('full_name')}
                    className={styles.input}
                    placeholder="Иванов Иван Иванович"
                  />
                  {errors.full_name && (
                    <p className={styles.errorText}>{errors.full_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className={styles.field}>
                  <label className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className={styles.input}
                    placeholder="ivan@company.com"
                  />
                  {errors.email && (
                    <p className={styles.errorText}>{errors.email.message}</p>
                  )}
                </div>

                {/* Телефон */}
                <div className={styles.field}>
                  <label className={styles.label}>Телефон</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className={styles.input}
                    placeholder="+7 (900) 123-45-67"
                  />
                </div>

                {/* Telegram */}
                <div className={styles.field}>
                  <label className={styles.label}>Telegram</label>
                  <input
                    type="text"
                    {...register('telegram')}
                    className={styles.input}
                    placeholder="@username"
                  />
                </div>

                {/* Дата рождения */}
                <div className={styles.field}>
                  <label className={styles.label}>Дата рождения</label>
                  <input
                    type="date"
                    {...register('birth_date')}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Рабочие данные */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Рабочие данные</h3>
              <div className={styles.grid}>
                {/* Должность */}
                <div className={styles.field}>
                  <label className={styles.label}>Должность</label>
                  <input
                    type="text"
                    {...register('position')}
                    className={styles.input}
                    placeholder="Менеджер по тендерам"
                  />
                </div>

                {/* Отдел */}
                <div className={styles.field}>
                  <label className={styles.label}>Отдел</label>
                  <select {...register('department_id')} className={styles.select}>
                    <option value="">Не назначен</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className={styles.hint}>
                      💡 Создайте отделы в <a href="/admin/settings/departments" target="_blank">Настройках → Отделы</a>
                    </p>
                  )}
                </div>

                {/* Роль */}
                <div className={styles.field}>
                  <label className={styles.label}>
                    Роль в системе <span className={styles.required}>*</span>
                  </label>
                  <select {...register('role')} className={styles.select} disabled={loadingRoles}>
                    {loadingRoles ? (
                      <option>Загрузка ролей...</option>
                    ) : companyRoles.length > 0 ? (
                      companyRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))
                    ) : (
                      <option value="viewer">Наблюдатель</option>
                    )}
                  </select>
                  {errors.role && (
                    <p className={styles.errorText}>{errors.role.message}</p>
                  )}
                  {/* Показываем описание выбранной роли */}
                  {companyRoles.length > 0 && (() => {
                    const selectedRoleId = watch('role');
                    const selectedRole = companyRoles.find(r => r.id === selectedRoleId);
                    return (
                      <p className={styles.hint}>
                        💡 {selectedRole?.description || 'Роль определяет права доступа в системе'}
                      </p>
                    );
                  })()}
                </div>

                {/* Статус */}
                <div className={styles.field}>
                  <label className={styles.label}>Статус</label>
                  <select {...register('status')} className={styles.select}>
                    {Object.entries(EMPLOYEE_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Дата приема */}
                <div className={styles.field}>
                  <label className={styles.label}>Дата приема на работу</label>
                  <input
                    type="date"
                    {...register('hire_date')}
                    className={styles.input}
                  />
                </div>

                {/* График работы */}
                <div className={styles.field}>
                  <label className={styles.label}>График работы</label>
                  <input
                    type="text"
                    {...register('work_schedule')}
                    className={styles.input}
                    placeholder="5/2, 9:00-18:00"
                  />
                </div>
              </div>
            </div>

            {/* Создание учетной записи */}
            {mode === 'create' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Учетная запись</h3>
                
                <div className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    id="create_account"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <label htmlFor="create_account" className={styles.checkboxLabel}>
                    Создать учетную запись для входа в систему
                  </label>
                </div>

                {createAccount && (
                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Пароль <span className={styles.required}>*</span>
                      </label>
                      <div className={styles.passwordField}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          {...register('password')}
                          className={styles.input}
                          placeholder="Минимум 8 символов"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={styles.passwordToggle}
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      {errors.password && (
                        <p className={styles.errorText}>{errors.password.message}</p>
                      )}
                      <p className={styles.hint}>
                        💡 Сотрудник получит доступ к системе с этим паролем
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Заметки */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Дополнительно</h3>
              <div className={styles.fieldFull}>
                <label className={styles.label}>Заметки</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className={styles.textarea}
                  placeholder="Дополнительная информация о сотруднике..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting 
                ? (mode === 'edit' ? 'Сохранение...' : 'Создание...') 
                : (mode === 'edit' ? '✓ Сохранить' : '✓ Создать сотрудника')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
