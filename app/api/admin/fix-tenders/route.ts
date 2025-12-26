import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || user.email !== 'corvetik1@yandex.ru') {
            return NextResponse.json({ error: 'Unauthorized. Only corvetik1@yandex.ru can run this.' }, { status: 401 });
        }

        // Service role client to bypass RLS
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

        // 1. Find the target company "Личное пространство"
        // First find org
        const { data: org } = await adminClient
            .from('organizations')
            .select('id')
            .eq('name', 'Личное пространство')
            .single();

        if (!org) {
            return NextResponse.json({ error: 'Organization "Личное пространство" not found' });
        }

        const { data: company } = await adminClient
            .from('companies')
            .select('id')
            .eq('organization_id', org.id)
            .single();

        if (!company) {
            return NextResponse.json({ error: 'Company for "Личное пространство" not found' });
        }

        console.log(`Target Company ID: ${company.id}`);

        // 2. Update Tenders
        // We update all tenders created by this user to belong to this company
        // Based on types.ts, the column is 'created_by'
        
        // Safe update: Update where company_id is NULL or different, AND created_by is current user
        const { data: updatedTenders, error: updateError } = await adminClient
            .from('tenders')
            .update({ company_id: company.id })
            .eq('created_by', user.id)
            .select();

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update tenders: ' + updateError.message });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully linked ${updatedTenders.length} tenders to "Личное пространство"`,
            tenders: updatedTenders.map(t => t.id)
        });

    } catch (error) {
        console.error('Fix tenders error:', error);
        return NextResponse.json({ error: 'Internal Error: ' + error }, { status: 500 });
    }
}
