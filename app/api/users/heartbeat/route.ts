import { NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// POST /api/users/heartbeat - обновить last_seen_at текущего пользователя
export async function POST() {
  try {
    const supabase = await createRSCClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Обновляем last_seen_at
    const { error } = await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating last_seen_at:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/users/heartbeat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
