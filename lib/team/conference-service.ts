import { getSupabaseClient } from '@/lib/supabase/client';
import { createRSCClient } from '@/lib/supabase/helpers';
import type {
  Conference,
  CreateConferenceInput,
  ParticipantStatus,
} from './types';
import { logger } from "@/lib/logger";

// =====================================================
// JITSI UTILS
// =====================================================

/**
 * Генерирует уникальное имя комнаты для Jitsi
 */
export function generateJitsiRoomName(companyId: string, title: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  return `finapp-${sanitizedTitle}-${randomPart}-${timestamp}`;
}

/**
 * Получает URL для Jitsi комнаты
 */
export function getJitsiMeetUrl(roomName: string): string {
  return `https://meet.jit.si/${roomName}`;
}

/**
 * Получает embed URL для iframe
 */
export function getJitsiEmbedUrl(
  roomName: string,
  options?: {
    displayName?: string;
    email?: string;
    avatarUrl?: string;
  }
): string {
  const baseUrl = `https://meet.jit.si/${roomName}`;
  const params = new URLSearchParams();
  
  if (options?.displayName) {
    params.set('userInfo.displayName', options.displayName);
  }
  if (options?.email) {
    params.set('userInfo.email', options.email);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}#${queryString}` : baseUrl;
}

// =====================================================
// КОНФЕРЕНЦИИ
// =====================================================

export async function getConferences(companyId: string): Promise<Conference[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('conferences')
    .select(`
      *,
      participants:conference_participants(count)
    `)
    .eq('company_id', companyId)
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  if (error) {
    logger.error('Error fetching conferences:', error);
    return [];
  }

  return data.map(conf => ({
    ...conf,
    participants_count: conf.participants?.[0]?.count || 0,
  }));
}

export async function getUpcomingConferences(companyId: string, limit = 5): Promise<Conference[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('conferences')
    .select(`
      *,
      participants:conference_participants(*)
    `)
    .eq('company_id', companyId)
    .in('status', ['scheduled', 'active'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('Error fetching upcoming conferences:', error);
    return [];
  }

  return (data as Conference[]) || [];
}

export async function getConference(conferenceId: string): Promise<Conference | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('conferences')
    .select(`
      *,
      participants:conference_participants(*)
    `)
    .eq('id', conferenceId)
    .single();

  if (error) {
    logger.error('Error fetching conference:', error);
    return null;
  }

  return data as Conference | null;
}

export async function createConference(
  companyId: string,
  userId: string,
  input: CreateConferenceInput
): Promise<Conference | null> {
  const supabase = getSupabaseClient();
  
  const jitsiRoomName = generateJitsiRoomName(companyId, input.title);

  const { data: conference, error: confError } = await supabase
    .from('conferences')
    .insert({
      company_id: companyId,
      title: input.title,
      description: input.description || null,
      host_id: userId,
      jitsi_room_name: jitsiRoomName,
      scheduled_at: input.scheduled_at || null,
      duration_minutes: input.duration_minutes || 60,
      tender_id: input.tender_id || null,
      status: input.scheduled_at ? 'scheduled' : 'active',
    })
    .select()
    .single();

  if (confError || !conference) {
    logger.error('Error creating conference:', confError);
    return null;
  }

  // Add host as participant
  await supabase
    .from('conference_participants')
    .insert({
      conference_id: conference.id,
      user_id: userId,
      status: 'accepted',
    });

  // Add other participants if provided
  if (input.participant_ids && input.participant_ids.length > 0) {
    const participantsToInsert = input.participant_ids
      .filter(id => id !== userId)
      .map(participantId => ({
        conference_id: conference.id,
        user_id: participantId,
        status: 'invited' as ParticipantStatus,
      }));

    if (participantsToInsert.length > 0) {
      await supabase
        .from('conference_participants')
        .insert(participantsToInsert);
    }
  }

  return conference;
}

export async function updateConference(
  conferenceId: string,
  updates: Partial<Pick<Conference, 'title' | 'description' | 'scheduled_at' | 'duration_minutes' | 'status'>>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('conferences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', conferenceId);

  if (error) {
    logger.error('Error updating conference:', error);
    return false;
  }

  return true;
}

export async function startConference(conferenceId: string): Promise<boolean> {
  return updateConference(conferenceId, { status: 'active' });
}

export async function endConference(conferenceId: string): Promise<boolean> {
  return updateConference(conferenceId, { status: 'ended' });
}

export async function cancelConference(conferenceId: string): Promise<boolean> {
  return updateConference(conferenceId, { status: 'cancelled' });
}

export async function deleteConference(conferenceId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('conferences')
    .delete()
    .eq('id', conferenceId);

  if (error) {
    logger.error('Error deleting conference:', error);
    return false;
  }

  return true;
}

// =====================================================
// УЧАСТНИКИ
// =====================================================

export async function inviteToConference(
  conferenceId: string,
  userIds: string[]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const participantsToInsert = userIds.map(userId => ({
    conference_id: conferenceId,
    user_id: userId,
    status: 'invited' as ParticipantStatus,
  }));

  const { error } = await supabase
    .from('conference_participants')
    .upsert(participantsToInsert, { onConflict: 'conference_id,user_id' });

  if (error) {
    logger.error('Error inviting to conference:', error);
    return false;
  }

  return true;
}

export async function updateParticipantStatus(
  conferenceId: string,
  userId: string,
  status: ParticipantStatus
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const updates: Record<string, string | null> = { status };
  
  if (status === 'joined') {
    updates.joined_at = new Date().toISOString();
  } else if (status === 'left') {
    updates.left_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('conference_participants')
    .update(updates)
    .eq('conference_id', conferenceId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error updating participant status:', error);
    return false;
  }

  return true;
}

export async function removeFromConference(
  conferenceId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('conference_participants')
    .delete()
    .eq('conference_id', conferenceId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error removing from conference:', error);
    return false;
  }

  return true;
}

// =====================================================
// БЫСТРЫЙ СТАРТ КОНФЕРЕНЦИИ
// =====================================================

export async function quickStartConference(
  companyId: string,
  userId: string,
  title?: string
): Promise<Conference | null> {
  return createConference(companyId, userId, {
    title: title || `Быстрая встреча ${new Date().toLocaleString('ru-RU')}`,
  });
}
