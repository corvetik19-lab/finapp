'use server';

import { createRouteClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GlobalRole, AppModule } from '@/lib/auth/types';
import { revalidatePath } from 'next/cache';
import { logger } from "@/lib/logger";

export interface AdminAuthUser {
    id: string;
    email?: string;
    full_name?: string;
    global_role?: string;
}

export async function getAllAuthUsers(): Promise<AdminAuthUser[]> {
    const adminClient = createAdminClient();

    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
        logger.error('Error listing users:', error);
        return [];
    }

    // Получаем профили для определения ролей
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, global_role')
        .in('id', users.map(u => u.id));

    const profileMap = new Map(profiles?.map(p => [p.id, p.global_role]));

    return users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name,
        global_role: profileMap.get(u.id),
    }));
}

export interface UserWithOrganizations extends AdminAuthUser {
    organizations: {
        id: string;
        name: string;
        role: string;
    }[];
}

export async function getUsersWithOrganizations(): Promise<UserWithOrganizations[]> {
    const adminClient = createAdminClient();

    // Получаем всех пользователей
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
        logger.error('Error listing users:', error);
        return [];
    }

    // Получаем профили
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, global_role')
        .in('id', users.map(u => u.id));

    const profileMap = new Map(profiles?.map(p => [p.id, p.global_role]));
    
    // Получаем список super_admin ID для фильтрации
    const superAdminIds = new Set(
        (profiles || [])
            .filter(p => p.global_role === 'super_admin')
            .map(p => p.id)
    );

    // Получаем членство в компаниях
    const { data: memberships } = await adminClient
        .from('company_members')
        .select(`
            user_id,
            role,
            company_id,
            company:companies(
                id,
                name,
                organization:organizations(id, name)
            )
        `)
        .eq('status', 'active');
    
    // Получаем роли пользователей из user_roles (реальные роли: просчётчик, менеджер и т.д.)
    // Роли привязаны к компании через roles.company_id
    const { data: userRoles } = await adminClient
        .from('user_roles')
        .select(`
            user_id,
            role_id,
            roles(name, company_id)
        `);
    
    // Создаём карту ролей: user_id + company_id -> role_name
    const userRolesMap = new Map<string, string>();
    userRoles?.forEach(ur => {
        if (ur.user_id && ur.roles) {
            const roleData = ur.roles as unknown;
            const roleObj = Array.isArray(roleData) ? roleData[0] : roleData;
            const typedRole = roleObj as { name?: string; company_id?: string } | null;
            if (typedRole?.name && typedRole?.company_id) {
                userRolesMap.set(`${ur.user_id}:${typedRole.company_id}`, typedRole.name);
            }
        }
    });

    // Группируем членства по пользователям
    // Super_admin показываем только в его собственной организации ("Личное пространство")
    const membershipMap = new Map<string, { id: string; name: string; role: string }[]>();
    
    memberships?.forEach(m => {
        if (!m.user_id || !m.company) return;
        
        const companyData = m.company as unknown;
        const companyObj = Array.isArray(companyData) ? companyData[0] : companyData;
        if (!companyObj || typeof companyObj !== 'object') return;
        const company = companyObj as { id: string; name: string; organization?: unknown };
        const orgData = company.organization;
        const org = Array.isArray(orgData) ? orgData[0] : orgData;
        const orgTyped = org as { id: string; name: string } | undefined;
        const orgName = orgTyped?.name || company.name;
        const orgId = orgTyped?.id || company.id;
        
        const isSuperAdmin = superAdminIds.has(m.user_id);
        
        // Super_admin показываем только в его "Личное пространство"
        // В других организациях он не должен отображаться
        if (isSuperAdmin && orgName !== 'Личное пространство') return;
        
        // Получаем реальную роль из user_roles, если нет - используем company_members.role
        const realRole = userRolesMap.get(`${m.user_id}:${m.company_id}`) || m.role;
        
        if (!membershipMap.has(m.user_id)) {
            membershipMap.set(m.user_id, []);
        }
        
        // Проверяем что организация ещё не добавлена
        const existing = membershipMap.get(m.user_id)!;
        if (!existing.find(o => o.id === orgId)) {
            existing.push({
                id: orgId,
                name: orgName,
                role: realRole,
            });
        }
    });

    return users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name,
        global_role: profileMap.get(u.id),
        organizations: membershipMap.get(u.id) || [],
    }));
}

export async function getUsers(query?: string) {
    const supabase = await createRouteClient();

    let dbQuery = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (query) {
        dbQuery = dbQuery.ilike('email', `%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
        logger.error('Error fetching users:', error);
        throw new Error('Failed to fetch users');
    }

    return data;
}

export async function updateUserGlobalRole(userId: string, role: GlobalRole) {
    const supabase = await createRouteClient();

    // Verify requester is super_admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: requester } = await supabase
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .single();

    if (requester?.global_role !== 'super_admin') {
        throw new Error('Only Super Admin can change roles');
    }

    const { error } = await supabase
        .from('profiles')
        .update({ global_role: role })
        .eq('id', userId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin/users');
}

export async function updateUserApps(userId: string, apps: AppModule[]) {
    const supabase = await createRouteClient();

    // Verify requester is admin or super_admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: requester } = await supabase
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .single();

    if (!['super_admin', 'admin'].includes(requester?.global_role || '')) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabase
        .from('profiles')
        .update({ allowed_apps: apps })
        .eq('id', userId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin/users');
}
