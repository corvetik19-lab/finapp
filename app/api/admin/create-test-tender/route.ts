import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return NextResponse.json({ error: 'Unauthorized' });

        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Find Company "Личное пространство"
        const { data: org } = await adminClient.from('organizations').select('id').eq('name', 'Личное пространство').single();
        if (!org) return NextResponse.json({ error: 'Org not found' });

        const { data: company } = await adminClient.from('companies').select('id').eq('organization_id', org.id).single();
        if (!company) return NextResponse.json({ error: 'Company not found' });

        // 2. Create Tender
        const { data: tender, error } = await adminClient.from('tenders').insert({
            company_id: company.id,
            created_by: user.id,
            purchase_number: 'TEST-' + Date.now(),
            subject: 'Тестовый тендер (восстановление)',
            customer: 'Тестовый Заказчик',
            nmck: 100000000, // 1 млн руб
            submission_deadline: new Date(Date.now() + 86400000 * 7).toISOString(), // +7 days
            status: 'active',
            stage_id: 'unknown', // Might need valid stage_id if FK exists. usually nullable or default?
            // If stage_id is required FK, we need to find one.
        }).select().single();

        if (error) {
            // If stage_id failed, try finding a stage
            if (error.message.includes('stage_id')) {
                 const { data: stage } = await adminClient.from('tender_stages').select('id').limit(1).single();
                 if (stage) {
                     const { data: tender2, error: error2 } = await adminClient.from('tenders').insert({
                        company_id: company.id,
                        created_by: user.id,
                        purchase_number: 'TEST-' + Date.now(),
                        subject: 'Тестовый тендер (восстановление)',
                        customer: 'Тестовый Заказчик',
                        nmck: 100000000,
                        submission_deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
                        status: 'active',
                        stage_id: stage.id
                    }).select().single();
                    
                    if (error2) return NextResponse.json({ error: 'Retry failed: ' + error2.message });
                    return NextResponse.json({ success: true, tender: tender2 });
                 }
            }
            return NextResponse.json({ error: 'Failed: ' + error.message });
        }

        return NextResponse.json({ success: true, tender });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Error: ' + error });
    }
}
