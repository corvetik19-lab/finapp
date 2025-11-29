import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return NextResponse.json({ error: 'Unauthorized' });

        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 2. List All Organizations & Companies
        const { data: orgs } = await adminClient.from('organizations').select('id, name');
        const { data: companies } = await adminClient.from('companies').select('id, name, organization_id');

        // 3. Tender Stats by Company
        // We can't do group by easily with simple client, so we fetch company_ids of all tenders
        const { data: allTendersLite } = await adminClient
            .from('tenders')
            .select('id, company_id, created_by');
            
        const stats: Record<string, number> = {};
        let orphansCount = 0;
        let tendersByUserCount = 0;

        allTendersLite?.forEach(t => {
            const cid = t.company_id || 'null';
            stats[cid] = (stats[cid] || 0) + 1;
            if (!t.company_id) orphansCount++;
            if (t.created_by === user.id) tendersByUserCount++;
        });

        // 4. Raw Sample (Any 5 tenders)
        const { data: rawSample } = await adminClient
            .from('tenders')
            .select('*')
            .limit(5);

        // 6. Check Stages & Templates
        const { count: stagesCount } = await adminClient.from('tender_stages').select('*', { count: 'exact', head: true });
        const { count: templatesCount } = await adminClient.from('tender_stage_templates').select('*', { count: 'exact', head: true });

        return NextResponse.json({
            current_user_id: user.id,
            tenders_found_for_user_id: tendersByUserCount,
            tenders_total_in_db: rawSample?.length || 0, // Just a hint if sample is empty
            stages_count: stagesCount,
            templates_count: templatesCount,
            organizations: orgs,
            companies: companies,
            tenders_stats_by_company_id: stats,
            orphans_count: orphansCount,
            raw_tenders_sample: rawSample
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Error: ' + error });
    }
}
