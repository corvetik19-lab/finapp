import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conferenceId: string }> }
) {
  try {
    const { conferenceId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conference, error } = await supabase
      .from('conferences')
      .select(`
        *,
        participants:conference_participants(*)
      `)
      .eq('id', conferenceId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: conference });
  } catch (error) {
    console.error('Error in GET /api/team/conferences/[conferenceId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conferenceId: string }> }
) {
  try {
    const { conferenceId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: conference, error } = await supabase
      .from('conferences')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conferenceId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: conference });
  } catch (error) {
    console.error('Error in PATCH /api/team/conferences/[conferenceId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conferenceId: string }> }
) {
  try {
    const { conferenceId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('conferences')
      .delete()
      .eq('id', conferenceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/team/conferences/[conferenceId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
