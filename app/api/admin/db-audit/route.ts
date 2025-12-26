import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Missing env vars' });
        }

        const adminClient = createClient(supabaseUrl, supabaseKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // List all tables in public schema
        // We can't easily list tables via JS client standard API without calling Postgres meta or rpc.
        // But we can try to select count from known tables.

        const tables = [
            'tenders',
            'tender_stages',
            'tender_stage_templates',
            'organizations',
            'companies',
            'employees',
            'profiles',
            'procurements', // hypothesis
            'purchases' // hypothesis
        ];

        const stats: Record<string, string | number | null> = {};

        for (const table of tables) {
            const { count, error } = await adminClient
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            stats[table] = error ? error.message : count;
        }

        return NextResponse.json({
            connected_to_url: supabaseUrl,
            table_stats: stats
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Error: ' + error });
    }
}
