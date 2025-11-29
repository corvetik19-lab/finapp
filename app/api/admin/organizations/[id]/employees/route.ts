import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/types';
import { createClient } from '@supabase/supabase-js';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

// GET: Fetch employees for an organization with permissions
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile || !isAdmin(profile)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: orgId } = await context.params;

        // 0. Resolve Company ID from Organization ID
        const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('organization_id', orgId)
            .single();

        if (!company) {
            // If no company found for this org, return empty or 404
            return NextResponse.json([]);
        }

        // 0.1. Get list of super_admin user IDs to exclude from employees list
        const { data: superAdmins } = await supabase
            .from('profiles')
            .select('id')
            .eq('global_role', 'super_admin');
        
        const superAdminIds = new Set((superAdmins || []).map(sa => sa.id));

        // 1. Fetch employees using company_id
        const { data: allEmployees, error: empError } = await supabase
            .from('employees')
            .select('id, user_id, full_name, email, position, department, role, status, created_at')
            .eq('company_id', company.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (empError) {
            console.error('Error fetching employees:', empError);
            return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
        }

        // Filter out super admins from the list (server-side filtering)
        const finalEmployees = (allEmployees || []).filter(emp => 
            !emp.user_id || !superAdminIds.has(emp.user_id)
        );

        if (finalEmployees.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch company members permissions
        const userIds = finalEmployees.map(e => e.user_id).filter(Boolean);
        
        const { data: members, error: memError } = await supabase
            .from('company_members')
            .select('user_id, permissions')
            .eq('company_id', company.id) // Use company.id here too
            .in('user_id', userIds);

        if (memError) {
            console.error('Error fetching members:', memError);
        }

        // 3. Merge data
        const result = finalEmployees.map(emp => {
            const member = members?.find(m => m.user_id === emp.user_id);
            return {
                ...emp,
                permissions: member?.permissions || {}
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in GET /api/admin/organizations/[id]/employees:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Invite employee
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile || !isAdmin(profile)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: orgId } = await context.params;
        const { email, full_name, role, position, department, password } = await request.json();

        if (!email || !full_name || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Use service role client for user management
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

        // 1. Find company
        const { data: company } = await adminClient
            .from('companies')
            .select('id')
            .eq('organization_id', orgId)
            .single();

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // 2. Find or Create user
        let userId;
        const { data: existingUser } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            userId = existingUser.id;
        } else {
            // Если передан пароль, создаем пользователя сразу
            if (password) {
                const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true, // Сразу подтверждаем email
                    user_metadata: { full_name }
                });

                if (createError) {
                    console.error('Create user error:', createError);
                    return NextResponse.json({ error: 'Failed to create user: ' + createError.message }, { status: 500 });
                }
                userId = newUser.user.id;
            } else {
                // Иначе отправляем приглашение (magic link)
                const { data: newUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
                    data: { full_name }
                });
                if (inviteError) {
                    console.error('Invite error:', inviteError);
                    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
                }
                userId = newUser.user.id;
            }
        }

        // 3. Add to company_members (only tenders access)
        const { error: memberError } = await adminClient.from('company_members').insert({
            company_id: company.id,
            user_id: userId,
            role: role,
            status: 'active',
            permissions: {
                allowed_modes: ['tenders']
            }
        });

        if (memberError) {
            // Ignore duplicate key error (already member)
            if (!memberError.message.includes('duplicate key')) {
                console.error('Member add error:', memberError);
                return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
            }
        }

        // 4. Add to employees table
        const { error: empError } = await adminClient.from('employees').insert({
            user_id: userId,
            company_id: company.id,
            full_name,
            email,
            role,
            position,
            department,
            status: 'active',
            created_at: new Date().toISOString()
        });

        if (empError) {
             console.error('Employee add error:', empError);
             // Don't fail if employee record fails but member added
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in POST /api/admin/organizations/[id]/employees:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update employee permissions
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile || !isAdmin(profile)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: orgId } = await context.params;
        const body = await request.json();
        const { employeeId, allowed_modes } = body;

        if (!employeeId || !allowed_modes) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Find user_id by employeeId
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('user_id')
            .eq('id', employeeId)
            .single();

        if (empError || !employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // 2. Update permissions in company_members
        // First fetch current permissions to preserve other fields
        const { data: member, error: memFetchError } = await supabase
            .from('company_members')
            .select('permissions')
            .eq('company_id', orgId)
            .eq('user_id', employee.user_id)
            .single();

        if (memFetchError) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        const updatedPermissions = {
            ...member.permissions as object,
            allowed_modes
        };

        const { error: updateError } = await supabase
            .from('company_members')
            .update({ permissions: updatedPermissions })
            .eq('company_id', orgId)
            .eq('user_id', employee.user_id);

        if (updateError) {
            console.error('Error updating permissions:', updateError);
            return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH /api/admin/organizations/[id]/employees:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove employee
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile || !isAdmin(profile)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // const { id: orgId } = await context.params; // Not needed
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('id');

        if (!employeeId) {
            return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });
        }

        // 1. Fetch employee to check protection
        const { data: employee, error: fetchError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (fetchError || !employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Protection check
        const isProtected = 
            employee.position === 'Системный Администратор' || 
            employee.position === 'Владелец' ||
            employee.full_name === 'Сисадмин' || 
            employee.full_name === 'Администратор компании';

        if (isProtected) {
            return NextResponse.json(
                { error: 'Cannot delete system employees (Sysadmin or Owner)' }, 
                { status: 403 }
            );
        }

        // Use service role client for deletion
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

        // 2. Delete from company_members
        const { error: memberError } = await adminClient
            .from('company_members')
            .delete()
            .eq('company_id', employee.company_id)
            .eq('user_id', employee.user_id);

        if (memberError) {
            console.error('Error removing member:', memberError);
            return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
        }

        // 3. Delete from employees (soft delete usually, but here hard delete for now or update status)
        // User said: "he is deleted if the organization is deleted". implying hard delete is fine for manual removal.
        const { error: deleteError } = await adminClient
            .from('employees')
            .delete()
            .eq('id', employeeId);

        if (deleteError) {
             console.error('Error deleting employee:', deleteError);
             return NextResponse.json({ error: 'Failed to delete employee record' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error in DELETE /api/admin/organizations/[id]/employees:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
