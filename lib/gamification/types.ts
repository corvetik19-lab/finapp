/**
 * Типы для системы геймификации
 */

export type AchievementTier = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'transactions' | 'savings' | 'streaks' | 'budgets' | 'ai' | 'streak';
export type RequirementType = 'count' | 'amount' | 'streak' | 'specific';
export type StreakType = 'daily_login' | 'daily_transaction' | 'budget_check';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementTier;
  points: number;
  requirement_type: RequirementType;
  requirement_value: number | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  is_notified: boolean;
  achievement?: AchievementDefinition; // Joined data
}

export interface ActivityStreak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  started_at: string;
  updated_at: string;
}

export interface UserLevel {
  id: string;
  user_id: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  total_xp: number;
  created_at: string;
  updated_at: string;
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  percentage: number;
}

// Для UI компонентов
export interface AchievementWithProgress extends AchievementDefinition {
  unlocked: boolean;
  unlocked_at?: string;
  progress: number;
  maxProgress: number;
  percentage: number;
}

// Категории достижений для UI
export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, { name: string; icon: string; color: string }> = {
  transactions: {
    name: 'Транзакции',
    icon: '📝',
    color: '#3b82f6',
  },
  savings: {
    name: 'Накопления',
    icon: '💰',
    color: '#10b981',
  },
  streaks: {
    name: 'Стрики',
    icon: '🔥',
    color: '#f59e0b',
  },
  streak: {
    name: 'Стрик',
    icon: '🔥',
    color: '#f59e0b',
  },
  budgets: {
    name: 'Бюджеты',
    icon: '💼',
    color: '#8b5cf6',
  },
  ai: {
    name: 'AI',
    icon: '🤖',
    color: '#ec4899',
  },
};

// Тиры достижений для UI
export const ACHIEVEMENT_TIERS: Record<AchievementTier, { name: string; color: string; glow: string }> = {
  common: {
    name: 'Обычное',
    color: '#6b7280',
    glow: 'rgba(107, 114, 128, 0.3)',
  },
  rare: {
    name: 'Редкое',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  epic: {
    name: 'Эпическое',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  legendary: {
    name: 'Легендарное',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.6)',
  },
};

// Вычисление уровня из XP (синхронизировано с SQL функцией)
export function calculateLevelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Необходимый XP для следующего уровня
export function getXPForNextLevel(currentLevel: number): number {
  return (currentLevel * currentLevel - 2 * currentLevel + 1) * 100;
}

// Прогресс до следующего уровня
export function getLevelProgress(xp: number): { current: number; next: number; percentage: number } {
  const currentLevel = calculateLevelFromXP(xp);
  const currentLevelXP = getXPForNextLevel(currentLevel - 1);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const progressXP = xp - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;
  const percentage = (progressXP / requiredXP) * 100;

  return {
    current: progressXP,
    next: requiredXP,
    percentage: Math.min(100, Math.max(0, percentage)),
  };
}
