/**
 * Create Storage Policies for attachments bucket
 * Run: node scripts/create-storage-policies.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const policies = [
  {
    name: 'Users can upload own files',
    operation: 'INSERT',
    sql: `
      CREATE POLICY "Users can upload own files"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (
        bucket_id = 'attachments' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    `
  },
  {
    name: 'Users can view own files',
    operation: 'SELECT',
    sql: `
      CREATE POLICY "Users can view own files"
      ON storage.objects
      FOR SELECT
      TO public
      USING (
        bucket_id = 'attachments' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    `
  },
  {
    name: 'Users can update own files',
    operation: 'UPDATE',
    sql: `
      CREATE POLICY "Users can update own files"
      ON storage.objects
      FOR UPDATE
      TO public
      USING (
        bucket_id = 'attachments' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    `
  },
  {
    name: 'Users can delete own files',
    operation: 'DELETE',
    sql: `
      CREATE POLICY "Users can delete own files"
      ON storage.objects
      FOR DELETE
      TO public
      USING (
        bucket_id = 'attachments' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    `
  }
];

async function createPolicies() {
  console.log('🚀 Creating storage policies for attachments bucket...\n');

  for (const policy of policies) {
    try {
      console.log(`📝 Creating policy: ${policy.name} (${policy.operation})...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: policy.sql
      });

      if (error) {
        // Check if policy already exists
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ℹ️  Policy already exists, skipping`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Created successfully`);
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`);
    }
    console.log('');
  }

  console.log('✅ Storage policies setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Verify policies in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/storage/policies');
  console.log('2. Test file upload in your app');
}

createPolicies().catch(console.error);
