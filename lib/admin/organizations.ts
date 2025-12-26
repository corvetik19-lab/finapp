'use server';

import { createRouteClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { Organization } from '@/lib/auth/types';
import { logger } from "@/lib/logger";

export async function getOrganizations() {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        logger.error('Error fetching organizations:', error);
        throw new Error('Failed to fetch organizations');
    }

    return data as Organization[];
}

export async function createOrganization(formData: FormData) {
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
        throw new Error('Only Super Admin can create organizations');
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const allowedModesJson = formData.get('allowed_modes') as string;
    const ownerId = formData.get('owner_id') as string;

    let allowedModes: string[] = ['finance', 'tenders', 'personal', 'investments']; // default fallback
    try {
        if (allowedModesJson) {
            allowedModes = JSON.parse(allowedModesJson);
        }
    } catch (e) {
        logger.error('Error parsing allowed_modes:', e);
    }

    if (!name) throw new Error('Name is required');

    const { data: org, error } = await supabase
        .from('organizations')
        .insert({
            name,
            description,
            status: 'active',
            is_active: true,
            allowed_modes: allowedModes,
            settings: {
                features: { tenders: true, analytics: true, reports: true },
                limits: { max_companies: 10, max_users_per_company: 50 }
            }
        })
        .select('id')
        .single();

    if (error) throw new Error(error.message);

    // Create company structure
    const { data: newCompany, error: createCompanyError } = await supabase
        .from('companies')
        .insert({
            organization_id: org.id,
            name: name,
            status: 'active'
        })
        .select('id')
        .single();
        
    if (createCompanyError) {
        logger.error('Error creating company:', createCompanyError);
    } else if (newCompany && ownerId) {
        // Получаем email владельца
        const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', ownerId)
            .single();
        const ownerEmail = ownerProfile?.email || '';

        // Добавляем владельца в company_members
        await supabase.from('company_members').insert({
            company_id: newCompany.id,
            user_id: ownerId,
            role: 'admin',
            status: 'active',
            permissions: { allowed_modes: allowedModes }
        });

        // Добавляем владельца в employees
        await supabase.from('employees').insert({
            company_id: newCompany.id,
            user_id: ownerId,
            full_name: '',
            email: ownerEmail,
            role: 'admin',
            position: 'Администратор',
            status: 'active',
            created_at: new Date().toISOString()
        });
    }

    revalidatePath('/admin/organizations');
}

export async function toggleOrganizationStatus(orgId: string, isActive: boolean) {
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
        throw new Error('Only Super Admin can update organizations');
    }

    const { error } = await supabase
        .from('organizations')
        .update({ is_active: isActive, status: isActive ? 'active' : 'suspended' })
        .eq('id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin/organizations');
}

export async function joinOrganizationAsAdmin(orgId: string) {
    // Use service role for admin operations that need to bypass RLS
    const serviceSupabase = createAdminClient();
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // 1. Находим компанию организации
    const { data: company } = await serviceSupabase
        .from('companies')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

    // Если компании нет, создаём её
    let companyId = company?.id;
    if (!companyId) {
        const { data: newCompany, error: createError } = await serviceSupabase
            .from('companies')
            .insert({
                organization_id: orgId,
                name: 'Main Company',
                status: 'active'
            })
            .select('id')
            .single();
            
        if (createError) {
            logger.error('Error creating company:', createError);
            throw new Error('Failed to create company structure');
        }
        companyId = newCompany.id;
    }

    // Супер-админ НЕ добавляется в company_members - только устанавливается active_company_id
    // Это позволяет ему видеть данные организации без добавления в список сотрудников
    await serviceSupabase
        .from('profiles')
        .update({ active_company_id: companyId })
        .eq('id', user.id);

    revalidatePath('/admin/organizations');
    revalidatePath('/');
}

export async function leaveOrganizationAsAdmin(orgId: string) {
    const serviceSupabase = createAdminClient();
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // 1.  
    const { data: company } = await serviceSupabase
        .from('companies')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

    if (!company) return;

    // 2.   
    const { error } = await serviceSupabase
        .from('company_members')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    //   
    await serviceSupabase
        .from('profiles')
        .update({ active_company_id: null })
        .eq('id', user.id);

    revalidatePath('/admin/organizations');
    revalidatePath('/');
}

export async function deleteOrganization(orgId: string) {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Verify requester is super_admin
    const { data: requester } = await supabase
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .single();

    if (requester?.global_role !== 'super_admin') {
        throw new Error('Only Super Admin can delete organizations');
    }

    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin/organizations');
}

export async function loginAsEmployee(employeeUserId: string, organizationId: string) {
    const serviceSupabase = createAdminClient();
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Проверяем что текущий пользователь - супер-админ
    const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .single();

    if (profile?.global_role !== 'super_admin') {
        throw new Error('Only Super Admin can login as employee');
    }

    // Проверяем что целевой пользователь существует
    const { data: targetProfile } = await serviceSupabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', employeeUserId)
        .single();

    if (!targetProfile) {
        throw new Error('Employee not found');
    }

    // Находим компанию организации
    const { data: company } = await serviceSupabase
        .from('companies')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (!company) {
        throw new Error('Company not found');
    }

    // Сохраняем информацию об имперсонации в профиле текущего пользователя
    await serviceSupabase
        .from('profiles')
        .update({ 
            active_company_id: company.id,
            impersonating_user_id: employeeUserId,
            impersonating_user_name: targetProfile.full_name
        })
        .eq('id', user.id);

    revalidatePath('/');
    revalidatePath('/dashboard');
}

export async function stopImpersonating() {
    const serviceSupabase = createAdminClient();
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Очищаем информацию об имперсонации
    await serviceSupabase
        .from('profiles')
        .update({ 
            impersonating_user_id: null,
            impersonating_user_name: null
        })
        .eq('id', user.id);

    revalidatePath('/');
    revalidatePath('/dashboard');
}
