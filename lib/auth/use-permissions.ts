'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { UserProfile, AppModule } from '@/lib/auth/types';

export function usePermissions() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseClient();

        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile(data);
            setLoading(false);
        }

        loadProfile();
    }, []);

    const hasAppAccess = (app: AppModule) => {
        if (!profile) return false;
        if (profile.global_role === 'super_admin') return true;
        return profile.allowed_apps?.includes(app) ?? false;
    };

    const isAdmin = ['super_admin', 'admin'].includes(profile?.global_role || '');
    const isSuperAdmin = profile?.global_role === 'super_admin';

    return {
        profile,
        loading,
        hasAppAccess,
        isAdmin,
        isSuperAdmin
    };
}
