'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/auth/types';
import { Organization } from '@/lib/organizations/types';
import { loginAsEmployee } from '@/lib/admin/organizations';
import { Eye, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface OrganizationEmployeesProps {
    organization: Organization;
    profile: UserProfile;
}

interface Employee {
    id: string;
    full_name: string;
    email: string;
    position: string | null;
    department: string | null;
    role: string;
    role_id: string | null;
    role_name: string | null;
    role_color: string | null;
    status: string;
    created_at: string;
    last_sign_in_at: string | null;
}

export function OrganizationEmployees({ organization }: OrganizationEmployeesProps) {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingIn, setLoggingIn] = useState<string | null>(null);
    
    // View Modal
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const loadEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/organizations/${organization.id}/employees`);
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    }, [organization.id]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const openViewModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowViewModal(true);
    };

    const handleLoginAsEmployee = async (employee: Employee) => {
        setLoggingIn(employee.id);
        try {
            await loginAsEmployee(employee.id, organization.id);
            router.push('/dashboard');
            router.refresh();
        } catch (error) {
            console.error('Error impersonating user:', error);
            alert(error instanceof Error ? error.message : 'Ошибка при входе под пользователем');
            setLoggingIn(null);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        return date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="bg-card rounded-xl border p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Сотрудники организации</h2>
                <p className="text-sm text-muted-foreground">
                    Всего сотрудников: {employees.length}
                </p>
            </div>

            {employees.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold mb-2">Нет сотрудников</h3>
                    <p className="text-muted-foreground">
                        В этой организации пока нет сотрудников.
                    </p>
                </div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium">Сотрудник</th>
                            <th className="text-left py-3 px-2 font-medium">Должность</th>
                            <th className="text-left py-3 px-2 font-medium">Роль</th>
                            <th className="text-left py-3 px-2 font-medium">Создан</th>
                            <th className="text-left py-3 px-2 font-medium">Последний вход</th>
                            <th className="text-right py-3 px-2 font-medium">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((employee) => {
                            const isAdminRole = employee.role === 'admin';

                            return (
                            <tr key={employee.id} className="border-b last:border-0 hover:bg-muted/50">
                                <td className="py-3 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                                            {employee.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium">{employee.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-2">
                                    <div>{employee.position || '—'}</div>
                                    {employee.department && (
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {employee.department}
                                        </div>
                                    )}
                                </td>
                                <td className="py-3 px-2">
                                    {employee.role_name ? (
                                        <span 
                                            className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                            style={{ backgroundColor: employee.role_color || '#667eea' }}
                                        >
                                            {employee.role_name}
                                        </span>
                                    ) : isAdminRole ? (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                                            Полный доступ
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Без роли</span>
                                    )}
                                </td>
                                <td className="py-3 px-2">{formatDate(employee.created_at)}</td>
                                <td className="py-3 px-2">{formatDate(employee.last_sign_in_at)}</td>
                                <td className="py-3 px-2 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openViewModal(employee)}
                                            title="Просмотр информации"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleLoginAsEmployee(employee)}
                                            disabled={loggingIn === employee.id}
                                            title="Войти под этим пользователем"
                                        >
                                            {loggingIn === employee.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                    Работаю...
                                                </>
                                            ) : (
                                                'Войти'
                                            )}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            )}

            {/* View Employee Modal */}
            <Dialog open={showViewModal} onOpenChange={(open) => { if (!open) { setShowViewModal(false); setSelectedEmployee(null); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Информация о сотруднике</DialogTitle>
                    </DialogHeader>
                    
                    {selectedEmployee && (
                        <>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xl">
                                    {selectedEmployee.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xl font-semibold">{selectedEmployee.full_name}</div>
                                    <div className="text-muted-foreground">{selectedEmployee.email}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground">Должность:</span>
                                    <span className="col-span-2 font-medium">{selectedEmployee.position || '—'}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground">Отдел:</span>
                                    <span className="col-span-2 font-medium">{selectedEmployee.department || '—'}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground">Роль:</span>
                                    <span className="col-span-2">
                                        {selectedEmployee.role_name ? (
                                            <span 
                                                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                                style={{ backgroundColor: selectedEmployee.role_color || '#667eea' }}
                                            >
                                                {selectedEmployee.role_name}
                                            </span>
                                        ) : selectedEmployee.role === 'admin' ? (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                                                Полный доступ
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Без роли</span>
                                        )}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground">Статус:</span>
                                    <span className="col-span-2 font-medium">{selectedEmployee.status || 'Активен'}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground">Создан:</span>
                                    <span className="col-span-2 font-medium">{formatDate(selectedEmployee.created_at)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground">Последний вход:</span>
                                    <span className="col-span-2 font-medium">{formatDate(selectedEmployee.last_sign_in_at)}</span>
                                </div>
                            </div>

                            <DialogFooter className="mt-4">
                                <Button
                                    onClick={() => handleLoginAsEmployee(selectedEmployee)}
                                    disabled={loggingIn === selectedEmployee.id}
                                >
                                    {loggingIn === selectedEmployee.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                                    {loggingIn === selectedEmployee.id ? 'Вход...' : 'Войти под этим пользователем'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
