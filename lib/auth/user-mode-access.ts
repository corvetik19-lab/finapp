import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Режимы, которые привязаны к индивидуальному пользователю (не к организации)
 */
export const USER_LEVEL_MODES = ['finance', 'investments'];

/**
 * Проверяет доступ пользователя к режимам через user_subscriptions
 * Возвращает массив режимов, к которым у пользователя есть активная подписка
 */
export async function getUserModeSubscriptions(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  
  // Проверяем роль super_admin - у них доступ ко всем режимам
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', userId)
    .single();
    
  if (profile?.global_role === 'super_admin') {
    return USER_LEVEL_MODES; // super_admin имеет доступ ко всем user-level режимам
  }
  
  // Получаем активные подписки пользователя
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('mode, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trial']);
    
  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }
  
  return subscriptions.map(s => s.mode);
}

/**
 * Проверяет, имеет ли пользователь доступ к конкретному режиму
 */
export async function hasUserModeAccess(userId: string, mode: string): Promise<boolean> {
  // Если режим не user-level, возвращаем true (проверка через организацию)
  if (!USER_LEVEL_MODES.includes(mode)) {
    return true;
  }
  
  const modes = await getUserModeSubscriptions(userId);
  return modes.includes(mode);
}

/**
 * Объединяет режимы организации с режимами пользователя
 * Для user-level режимов (finance, investments) требуется подписка пользователя
 * Для org-level режимов (tenders, ai_studio) требуется разрешение организации
 */
export async function getMergedUserModes(
  userId: string,
  orgAllowedModes: string[] = [],
  roleAllowedModes: string[] = []
): Promise<string[]> {
  // Получаем user-level режимы из подписок пользователя
  const userModes = await getUserModeSubscriptions(userId);
  
  // Org-level режимы берём из организации, с учётом роли
  const orgLevelModes = orgAllowedModes.filter(m => !USER_LEVEL_MODES.includes(m));
  
  // Если есть ограничения по роли, применяем их к org-level режимам
  const filteredOrgModes = roleAllowedModes.length > 0
    ? orgLevelModes.filter(m => roleAllowedModes.includes(m))
    : orgLevelModes;
  
  // Объединяем user-level и org-level режимы
  return [...new Set([...userModes, ...filteredOrgModes])];
}
