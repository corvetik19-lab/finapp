import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createRSCClient, getCachedUser } from '@/lib/supabase/server';
import { isAdmin, isOrganizationAdmin } from '@/lib/auth/types';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const {
        data: { user },
    } = await getCachedUser();

    if (!user) {
        console.log('AdminLayout: No user found, redirecting to login');
        redirect('/auth/login');
    }

    const supabase = await createRSCClient();

    // Fetch full profile to check global role
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Проверяем: глобальный админ ИЛИ админ организации
    const isGlobalAdmin = profile && isAdmin(profile);
    const isOrgAdmin = await isOrganizationAdmin(user.id, supabase);

    if (!isGlobalAdmin && !isOrgAdmin) {
        redirect('/'); // Or to a 403 page
    }

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900">Панель Администратора</h1>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <nav className="flex items-center gap-2">
                        <Link href="/admin/settings/users" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
                            Пользователи
                        </Link>
                        <Link href="/admin/settings/organization" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
                            Организации
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded uppercase">
                        {isGlobalAdmin ? profile?.global_role : 'org_admin'}
                    </span>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 p-6">
                {children}
            </div>
        </div>
    );
}
