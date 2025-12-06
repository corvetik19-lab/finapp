import { redirect } from 'next/navigation';
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

    // Layout просто пропускает children - всё оформление в settings/layout.tsx
    return <>{children}</>;
}
