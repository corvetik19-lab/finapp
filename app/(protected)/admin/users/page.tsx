import { getUsers } from '@/lib/admin/users';
import { createRSCClient } from '@/lib/supabase/server';
import { UsersTable } from '@/components/admin/users-table';

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const query = searchParams.q || '';
    const users = await getUsers(query);

    const supabase = await createRSCClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', currentUser!.id).single();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Пользователи</h2>
                    <p className="text-slate-500">Управление глобальными правами доступа</p>
                </div>
            </div>

            <UsersTable
                users={users}
                currentUserId={currentUser!.id}
                currentUserRole={currentProfile?.global_role || 'user'}
            />
        </div>
    );
}
