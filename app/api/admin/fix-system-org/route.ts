import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Проверяем, что это супер-админ
        const { data: profile } = await supabase
            .from('profiles')
            .select('global_role')
            .eq('id', user.id)
            .single();

        if (profile?.global_role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Используем service role для обхода RLS и записи
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // 1. Ищем организацию "Личное пространство"
        const { data: org } = await adminClient
            .from('organizations')
            .select('id')
            .eq('name', 'Личное пространство') // Или другое имя, если оно отличается
            .single();

        if (!org) {
            // Если не нашли по имени, попробуем найти по is_system (если есть такое поле) или просто вернем ошибку
            // В коде ранее использовалась проверка is_system
            return NextResponse.json({ error: 'Organization "Личное пространство" not found' });
        }

        // 2. Ищем компанию этой организации
        let { data: company } = await adminClient
            .from('companies')
            .select('id')
            .eq('organization_id', org.id)
            .single();

        if (!company) {
            // Если компании нет, создадим её
            const { data: newCompany, error: createError } = await adminClient
                .from('companies')
                .insert({
                    organization_id: org.id,
                    name: 'Личное пространство',
                    slug: `comp-${org.id.substring(0, 8)}`,
                    status: 'active'
                })
                .select('id')
                .single();
            
            if (createError) {
                return NextResponse.json({ error: 'Failed to create company: ' + createError.message });
            }
            company = newCompany;
        }

        // 3. Добавляем Супер-Админа как "Сисадмин"
        
        // 3.1 Company Member
        const { error: memberError } = await adminClient
            .from('company_members')
            .upsert({
                company_id: company.id,
                user_id: user.id,
                role: 'admin',
                status: 'active',
                permissions: { allowed_modes: ['finance', 'tenders', 'personal', 'investments'] }
            }, { onConflict: 'company_id,user_id' });

        if (memberError) {
            return NextResponse.json({ error: 'Member upsert failed: ' + memberError.message });
        }

        // 3.2 Employee
        // Проверяем, есть ли уже такой сотрудник
        const { data: existingEmployee } = await adminClient
            .from('employees')
            .select('id')
            .eq('company_id', company.id)
            .eq('user_id', user.id)
            .single();

        if (existingEmployee) {
            // Обновляем имя и должность
            await adminClient
                .from('employees')
                .update({
                    full_name: 'Сисадмин',
                    position: 'Системный Администратор',
                    role: 'admin'
                })
                .eq('id', existingEmployee.id);
                
            return NextResponse.json({ success: true, message: 'Updated existing Sysadmin record' });
        } else {
            // Создаем нового
            await adminClient
                .from('employees')
                .insert({
                    company_id: company.id,
                    user_id: user.id,
                    full_name: 'Сисадмин',
                    email: user.email,
                    role: 'admin',
                    position: 'Системный Администратор',
                    status: 'active',
                    created_at: new Date().toISOString()
                });
                
            return NextResponse.json({ success: true, message: 'Created Sysadmin record' });
        }

    } catch (error) {
        console.error('Fix script error:', error);
        return NextResponse.json({ error: 'Internal Error: ' + error }, { status: 500 });
    }
}
