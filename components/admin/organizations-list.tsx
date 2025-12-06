'use client';

import { useState } from 'react';
import { Organization } from '@/lib/auth/types';
import { toggleOrganizationStatus, joinOrganizationAsAdmin, deleteOrganization } from '@/lib/admin/organizations';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganizationsListProps {
    organizations: Organization[];
    isSuperAdmin: boolean;
    activeOrgId?: string | null;
}

export function OrganizationsList({ organizations, isSuperAdmin, activeOrgId }: OrganizationsListProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
        if (!isSuperAdmin) return;
        try {
            setLoadingId(orgId);
            await toggleOrganizationStatus(orgId, !currentStatus);
            router.refresh();
        } catch (error) {
            alert('Ошибка при обновлении статуса');
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async (orgId: string, orgName: string) => {
        if (!isSuperAdmin) return;
        
        if (!confirm(`Вы уверены, что хотите удалить организацию "${orgName}"? Это действие необратимо и удалит ВСЕ данные.`)) return;
        if (!confirm(`Подтвердите удаление организации "${orgName}".`)) return;

        try {
            setLoadingId(orgId);
            await deleteOrganization(orgId);
            router.refresh();
        } catch (error) {
            alert('Ошибка при удалении организации: ' + (error instanceof Error ? error.message : String(error)));
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleJoinOrganization = async (orgId: string) => {
        setLoadingId(orgId);
        try {
            await joinOrganizationAsAdmin(orgId);
        } catch (error) {
            alert('Ошибка при входе в организацию');
            console.error(error);
            setLoadingId(null);
            return;
        }
        // Перезагрузка страницы после успешного завершения
        router.refresh();
        setLoadingId(null);
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Статус</TableHead><TableHead>План</TableHead><TableHead>Создана</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
                <TableBody>
                    {organizations.map((org) => {
                        const isSystemOrg = org.name === 'Личное пространство';
                        const isActiveOrg = activeOrgId === org.id;
                        return (
                            <TableRow key={org.id} className={cn(loadingId === org.id && 'opacity-50')}>
                                <TableCell>
                                    <div className="font-medium">{org.name}{isSystemOrg && <Badge variant="secondary" className="ml-2 text-xs">SYSTEM</Badge>}</div>
                                    <div className="text-sm text-muted-foreground">{org.description || 'Нет описания'}</div>
                                </TableCell>
                                <TableCell><Badge variant={org.is_active ? 'default' : 'destructive'}>{org.is_active ? 'Активна' : 'Остановлена'}</Badge></TableCell>
                                <TableCell><Badge variant="outline">{org.subscription_plan}</Badge></TableCell>
                                <TableCell className="text-sm text-muted-foreground">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        {!isSystemOrg && (isActiveOrg ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Работаю</Badge> : <Button size="sm" onClick={() => handleJoinOrganization(org.id)} disabled={loadingId === org.id}>Войти</Button>)}
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/settings/organization/${org.id}`)}>Управление</Button>
                                        {isSuperAdmin && !isSystemOrg && <><Button variant={org.is_active ? 'destructive' : 'default'} size="sm" onClick={() => handleToggleStatus(org.id, org.is_active)} disabled={loadingId === org.id}>{loadingId === org.id ? '...' : org.is_active ? 'Блокировать' : 'Активировать'}</Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(org.id, org.name)} disabled={loadingId === org.id}><Trash2 className="h-4 w-4" /></Button></>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {organizations.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Нет организаций. Создайте первую!</TableCell></TableRow>}
                </TableBody>
            </Table>
        </div>
    );
}
