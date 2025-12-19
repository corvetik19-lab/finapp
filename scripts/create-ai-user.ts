import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function createAIUser() {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const email = 'ai.specialist@demo.ru';
  const password = 'aispecialist123';
  const fullName = 'ИИ Специалист';

  // Создаём пользователя
  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (userError) {
    console.error('Error creating user:', userError);
    return;
  }

  console.log('User created:', userData.user?.id);

  const userId = userData.user?.id;
  if (!userId) {
    console.error('No user ID');
    return;
  }

  // Создаём профиль
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      global_role: 'user',
    });

  if (profileError) {
    console.error('Error creating profile:', profileError);
  }

  // Получаем ID организации ИИ
  const { data: org } = await adminClient
    .from('organizations')
    .select('id')
    .eq('name', 'ИИ Студия Компания')
    .single();

  if (!org) {
    console.error('Organization not found');
    return;
  }

  console.log('Organization ID:', org.id);

  // Находим или создаём компанию для этой организации
  let companyId: string;
  const { data: existingCompany } = await adminClient
    .from('companies')
    .select('id')
    .eq('organization_id', org.id)
    .single();

  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    const { data: newCompany, error: companyError } = await adminClient
      .from('companies')
      .insert({
        name: 'ИИ Студия Компания',
        organization_id: org.id,
      })
      .select('id')
      .single();

    if (companyError || !newCompany) {
      console.error('Error creating company:', companyError);
      return;
    }
    companyId = newCompany.id;
  }

  console.log('Company ID:', companyId);

  // Добавляем пользователя в компанию
  const { error: memberError } = await adminClient
    .from('company_members')
    .upsert({
      user_id: userId,
      company_id: companyId,
      role: 'admin',
      status: 'active',
    });

  if (memberError) {
    console.error('Error adding member:', memberError);
  }

  console.log('✅ User created successfully!');
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password);
}

createAIUser().catch(console.error);
