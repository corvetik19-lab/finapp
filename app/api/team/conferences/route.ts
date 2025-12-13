import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      jitsi_room_name, 
      scheduled_at, 
      duration_minutes, 
      status,
      company_id, 
      host_id,
      participant_ids 
    } = body;

    if (!title || !company_id || !jitsi_room_name) {
      return NextResponse.json({ error: 'Title, company_id and jitsi_room_name are required' }, { status: 400 });
    }

    // Create conference
    const { data: conference, error: confError } = await supabase
      .from('conferences')
      .insert({
        company_id,
        title,
        description: description || null,
        jitsi_room_name,
        scheduled_at: scheduled_at || null,
        duration_minutes: duration_minutes || 60,
        status: status || 'scheduled',
        host_id: host_id || user.id,
      })
      .select()
      .single();

    if (confError) {
      console.error('Error creating conference:', confError);
      return NextResponse.json({ error: confError.message }, { status: 500 });
    }

    // Add host as participant
    await supabase
      .from('conference_participants')
      .insert({
        conference_id: conference.id,
        user_id: host_id || user.id,
        status: 'accepted',
      });

    // Add other participants
    if (participant_ids && participant_ids.length > 0) {
      const participantsToInsert = participant_ids
        .filter((id: string) => id !== (host_id || user.id))
        .map((participantId: string) => ({
          conference_id: conference.id,
          user_id: participantId,
          status: 'invited',
        }));

      if (participantsToInsert.length > 0) {
        await supabase
          .from('conference_participants')
          .insert(participantsToInsert);
      }
    }

    return NextResponse.json({ data: conference });
  } catch (error) {
    console.error('Error in POST /api/team/conferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    const { data: conferences, error } = await supabase
      .from('conferences')
      .select('*')
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: conferences });
  } catch (error) {
    console.error('Error in GET /api/team/conferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
