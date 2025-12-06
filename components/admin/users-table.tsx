'use client';

import { useState } from 'react';
import { UserProfile, GlobalRole, AppModule } from '@/lib/auth/types';
import { updateUserGlobalRole, updateUserApps } from '@/lib/admin/users';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface UsersTableProps {
    users: UserProfile[];
    currentUserId: string;
    currentUserRole: GlobalRole;
}

export function UsersTable({ users, currentUserId, currentUserRole }: UsersTableProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: GlobalRole) => {
        try {
            setLoadingId(userId);
            await updateUserGlobalRole(userId, newRole);
            router.refresh();
        } catch (error) {
            alert('Ошибка при обновлении роли');
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleAppToggle = async (userId: string, app: AppModule, currentApps: AppModule[]) => {
        try {
            setLoadingId(userId);
            const newApps = currentApps.includes(app)
                ? currentApps.filter(a => a !== app)
                : [...currentApps, app];

            await updateUserApps(userId, newApps);
            router.refresh();
        } catch (error) {
            alert('Ошибка при обновлении доступов');
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const APP_LABELS: Record<AppModule, string> = {
        finance: 'Финансы',
        investments: 'Инвестиции',
        tenders: 'Тендеры',
        personal: 'Личные',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Пользователь</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Глобальная Роль</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Доступные Модули</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Действия</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {users.map((user) => (
                        <tr key={user.id} className={loadingId === user.id ? 'opacity-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-10 w-10 flex-shrink-0">
                                        {user.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                className="h-10 w-10 rounded-full"
                                                src={user.avatar_url}
                                                alt=""
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                {user.email?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-slate-900">{user.full_name || 'Без имени'}</div>
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Select
                                    disabled={currentUserRole !== 'super_admin' || user.id === currentUserId}
                                    value={user.global_role}
                                    onValueChange={(val) => handleRoleChange(user.id, val as GlobalRole)}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2 flex-wrap max-w-xs">
                                    {(Object.keys(APP_LABELS) as AppModule[]).map((app) => (
                                        <Badge
                                            key={app}
                                            variant={user.allowed_apps?.includes(app) ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => user.id !== currentUserId && handleAppToggle(user.id, app, user.allowed_apps || [])}
                                        >
                                            {APP_LABELS[app]}
                                        </Badge>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className="text-slate-400">...</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
