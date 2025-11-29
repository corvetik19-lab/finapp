import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { isAdmin } from '@/lib/auth/types';
import { OrganizationDetails } from '@/components/admin/organization-details';

interface OrganizationPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
    const { id } = await params;
    const supabase = await createRSCClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Fetch profile to check admin status
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || !isAdmin(profile)) {
        redirect('/');
    }

    // Fetch organization details
    const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

    if (!organization) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Организация не найдена</h1>
            </div>
        );
    }

    return <OrganizationDetails organization={organization} profile={profile} />;
}
