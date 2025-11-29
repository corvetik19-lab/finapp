import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/types';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const MODES = ['finance', 'personal', 'investments', 'tenders'];

// GET: Fetch mode settings for an organization
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

        // Fetch allowed modes from organization
        const { data: org, error } = await supabase
            .from('organizations')
            .select('allowed_modes')
            .eq('id', orgId)
            .single();

        if (error) {
            console.error('Error fetching organization modes:', error);
            return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
        }

        const allowedModes = org.allowed_modes || [];

        // Map to expected format for frontend
        const modeSettings = MODES.map(modeKey => ({
            id: modeKey,
            org_id: orgId,
            mode_key: modeKey,
            is_enabled: allowedModes.includes(modeKey),
            settings: {}
        }));

        return NextResponse.json(modeSettings);
    } catch (error) {
        console.error('Error in GET /api/admin/organizations/[id]/modes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Update mode settings for an organization
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check super admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile || !isSuperAdmin(profile)) {
            return NextResponse.json({ error: 'Only super admins can modify mode settings' }, { status: 403 });
        }

        const { id: orgId } = await context.params;
        const body = await request.json();
        const { mode_key, is_enabled } = body;

        if (!MODES.includes(mode_key)) {
            return NextResponse.json({ error: 'Invalid mode key' }, { status: 400 });
        }

        // Fetch current allowed modes
        const { data: org } = await supabase
            .from('organizations')
            .select('allowed_modes')
            .eq('id', orgId)
            .single();
            
        let currentModes: string[] = org?.allowed_modes || [];
        
        if (is_enabled) {
            if (!currentModes.includes(mode_key)) {
                currentModes.push(mode_key);
            }
        } else {
            currentModes = currentModes.filter(m => m !== mode_key);
        }
        
        // Update allowed_modes
        const { error } = await supabase
            .from('organizations')
            .update({ 
                allowed_modes: currentModes,
                updated_at: new Date().toISOString() 
            })
            .eq('id', orgId);

        if (error) {
            console.error('Error updating mode setting:', error);
            return NextResponse.json({ error: 'Failed to update mode setting' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in POST /api/admin/organizations/[id]/modes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
