export type GlobalRole = 'super_admin' | 'admin' | 'user';

export type AppModule = 'investments' | 'finance' | 'tenders' | 'personal';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    global_role: GlobalRole;
    allowed_apps: AppModule[];
    updated_at: string;
}

export interface Organization {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    status: 'active' | 'suspended' | 'archived';
    is_active: boolean;
    subscription_plan: string;
    created_at: string;
}

// Helper to check permissions
export const hasAppAccess = (profile: UserProfile | null, app: AppModule): boolean => {
    if (!profile) return false;
    if (profile.global_role === 'super_admin') return true;
    return profile.allowed_apps.includes(app);
};

export const isAdmin = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    return ['super_admin', 'admin'].includes(profile.global_role);
};

// Проверка является ли пользователь админом организации (company_members.role = 'admin')
export const isOrganizationAdmin = async (userId: string, supabase: unknown): Promise<boolean> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: member } = await client
        .from('company_members')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'active')
        .in('role', ['admin', 'owner'])
        .limit(1)
        .single();
    
    return !!member;
};

export const isSuperAdmin = (profile: UserProfile | null): boolean => {
    return profile?.global_role === 'super_admin';
};
