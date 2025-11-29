import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function POST() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем что пользователь супер-админ
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    if (profile?.global_role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Используем service role для обновления
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Очищаем active_company_id
    const { error } = await serviceSupabase
      .from('profiles')
      .update({ active_company_id: null })
      .eq('id', user.id);

    if (error) {
      console.error('Error clearing active company:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Инвалидируем кэш для обновления UI
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exit active organization error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
