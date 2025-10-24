"use client";

import { useState, useEffect } from 'react';
import styles from './Achievements.module.css';
import type { AchievementWithProgress, ActivityStreak, UserLevel, AchievementCategory } from '@/lib/gamification/types';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_TIERS } from '@/lib/gamification/types';

export default function AchievementsClient() {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [streak, setStreak] = useState<ActivityStreak | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [levelProgress, setLevelProgress] = useState({ current: 0, next: 100, percentage: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Параллельно загружаем все данные
      const [achievementsRes, streaksRes, levelRes] = await Promise.all([
        fetch('/api/gamification/achievements'),
        fetch('/api/gamification/streaks'),
        fetch('/api/gamification/level'),
      ]);

      if (achievementsRes.ok) {
        const { achievements: data } = await achievementsRes.json();
        setAchievements(data);
      }

      if (streaksRes.ok) {
        const { streak: data } = await streaksRes.json();
        setStreak(data);
      }

      if (levelRes.ok) {
        const { level, progress } = await levelRes.json();
        setUserLevel(level);
        setLevelProgress(progress);
      }
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация достижений
  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  // Статистика
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка достижений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Заголовок */}
      <div className={styles.header}>
        <h1>🏆 Достижения</h1>
        <p>Ваш прогресс и награды</p>
      </div>

      {/* Карточка уровня */}
      {userLevel && (
        <div className={styles.levelCard}>
          <div className={styles.levelInfo}>
            <div className={styles.levelBadge}>
              <span className={styles.levelNumber}>{userLevel.level}</span>
            </div>
            <div className={styles.levelDetails}>
              <h2>Уровень {userLevel.level}</h2>
              <p>{userLevel.total_xp} XP</p>
            </div>
          </div>

          <div className={styles.levelProgressBar}>
            <div 
              className={styles.levelProgressFill}
              style={{ width: `${levelProgress.percentage}%` }}
            />
          </div>

          <div className={styles.levelStats}>
            <div className={styles.levelStat}>
              <span className={styles.levelStatValue}>{levelProgress.current}</span>
              <span className={styles.levelStatLabel}>/ {levelProgress.next} XP</span>
            </div>
            <div className={styles.levelStat}>
              <span className={styles.levelStatLabel}>До следующего уровня</span>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🏆</div>
          <div className={styles.statValue}>{unlockedCount}/{achievements.length}</div>
          <div className={styles.statLabel}>Разблокировано</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statValue}>{totalPoints}</div>
          <div className={styles.statLabel}>Очков заработано</div>
        </div>

        {streak && streak.current_streak > 0 && (
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🔥</div>
            <div className={styles.statValue}>{streak.current_streak || 0}</div>
            <div className={styles.statLabel}>Дней подряд</div>
          </div>
        )}

        {streak && streak.longest_streak > 0 && (
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⚡</div>
            <div className={styles.statValue}>{streak.longest_streak || 0}</div>
            <div className={styles.statLabel}>Рекорд</div>
          </div>
        )}
      </div>

      {/* Фильтры по категориям */}
      <div className={styles.categories}>
        <button
          className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Все ({achievements.length})
        </button>
        {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => {
          const count = achievements.filter(a => a.category === key).length;
          return (
            <button
              key={key}
              className={`${styles.categoryBtn} ${selectedCategory === key ? styles.active : ''}`}
              onClick={() => setSelectedCategory(key as AchievementCategory)}
            >
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Список достижений */}
      <div className={styles.achievementsGrid}>
        {filteredAchievements.map((achievement) => {
          const rarity = (achievement.rarity || 'common') as 'common' | 'rare' | 'epic' | 'legendary';
          const category = achievement.category as keyof typeof ACHIEVEMENT_CATEGORIES;
          const tierInfo = ACHIEVEMENT_TIERS[rarity];
          const catInfo = ACHIEVEMENT_CATEGORIES[category] || ACHIEVEMENT_CATEGORIES.transactions;

          return (
            <div
              key={achievement.id}
              className={`${styles.achievementCard} ${achievement.unlocked ? styles.unlocked : styles.locked}`}
            >
              <div 
                className={styles.achievementIcon}
                style={{
                  backgroundColor: achievement.unlocked ? catInfo.color : '#e5e7eb',
                  boxShadow: achievement.unlocked ? `0 0 20px ${tierInfo.glow}` : 'none',
                }}
              >
                {achievement.unlocked ? achievement.icon : '🔒'}
              </div>

              <div className={styles.achievementContent}>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>

                {!achievement.unlocked && achievement.requirement_value && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ 
                          width: `${achievement.percentage}%`,
                          backgroundColor: catInfo.color,
                        }}
                      />
                    </div>
                    <div className={styles.progressText}>
                      {achievement.progress} / {achievement.maxProgress}
                    </div>
                  </div>
                )}

                {achievement.unlocked && achievement.unlocked_at && (
                  <div className={styles.unlockedDate}>
                    Разблокировано {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>

              <div className={styles.achievementMeta}>
                <div 
                  className={styles.tierBadge}
                  style={{ 
                    backgroundColor: tierInfo.color,
                    color: achievement.rarity === 'legendary' ? '#000' : '#fff',
                  }}
                >
                  {tierInfo.name}
                </div>
                <div className={styles.points}>+{achievement.points} XP</div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h3>Нет достижений в этой категории</h3>
          <p>Попробуйте выбрать другую категорию</p>
        </div>
      )}
    </div>
  );
}
