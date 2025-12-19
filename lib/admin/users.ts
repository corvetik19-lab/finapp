'use server';

import { createRouteClient } from '@/lib/supabase/server';
import { GlobalRole, AppModule } from '@/lib/auth/types';
import { revalidatePath } from 'next/cache';

import { createClient } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

export interface AdminAuthUser {
    id: string;
    email?: string;
    full_name?: string;
    global_role?: string;
}

export async function getAllAuthUsers(): Promise<AdminAuthUser[]> {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
        logger.error('SUPABASE_SERVICE_ROLE_KEY is not set');
        return [];
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );

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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
        logger.error('SUPABASE_SERVICE_ROLE_KEY is not set');
        return [];
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );

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

    // Получаем членство в компаниях
    const { data: memberships } = await adminClient
        .from('company_members')
        .select(`
            user_id,
            role,
            company:companies(
                id,
                name,
                organization:organizations(id, name)
            )
        `)
        .eq('status', 'active');

    // Группируем членства по пользователям
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
        
        if (!membershipMap.has(m.user_id)) {
            membershipMap.set(m.user_id, []);
        }
        
        // Проверяем что организация ещё не добавлена
        const existing = membershipMap.get(m.user_id)!;
        if (!existing.find(o => o.id === orgId)) {
            existing.push({
                id: orgId,
                name: orgName,
                role: m.role,
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
