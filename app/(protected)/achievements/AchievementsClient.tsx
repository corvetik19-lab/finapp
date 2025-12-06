"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Flame, Zap, Loader2, Lock, Target } from 'lucide-react';
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
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6" />Достижения</h1><p className="text-muted-foreground">Ваш прогресс и награды</p></div>

      {userLevel && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">{userLevel.level}</div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Уровень {userLevel.level}</h2>
                <p className="text-sm text-muted-foreground">{userLevel.total_xp} XP</p>
                <Progress value={levelProgress.percentage} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{levelProgress.current} / {levelProgress.next} XP до следующего уровня</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><Trophy className="h-8 w-8 mx-auto text-yellow-500" /><p className="text-2xl font-bold">{unlockedCount}/{achievements.length}</p><p className="text-sm text-muted-foreground">Разблокировано</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Star className="h-8 w-8 mx-auto text-purple-500" /><p className="text-2xl font-bold">{totalPoints}</p><p className="text-sm text-muted-foreground">Очков</p></CardContent></Card>
        {streak && streak.current_streak > 0 && <Card><CardContent className="pt-6 text-center"><Flame className="h-8 w-8 mx-auto text-orange-500" /><p className="text-2xl font-bold">{streak.current_streak}</p><p className="text-sm text-muted-foreground">Дней подряд</p></CardContent></Card>}
        {streak && streak.longest_streak > 0 && <Card><CardContent className="pt-6 text-center"><Zap className="h-8 w-8 mx-auto text-blue-500" /><p className="text-2xl font-bold">{streak.longest_streak}</p><p className="text-sm text-muted-foreground">Рекорд</p></CardContent></Card>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={selectedCategory === 'all' ? "default" : "outline"} onClick={() => setSelectedCategory('all')}>Все ({achievements.length})</Button>
        {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => {
          const count = achievements.filter(a => a.category === key).length;
          return <Button key={key} size="sm" variant={selectedCategory === key ? "default" : "outline"} onClick={() => setSelectedCategory(key as AchievementCategory)}>{cat.icon} {cat.name} ({count})</Button>;
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAchievements.map((achievement) => {
          const rarity = (achievement.rarity || 'common') as 'common' | 'rare' | 'epic' | 'legendary';
          const category = achievement.category as keyof typeof ACHIEVEMENT_CATEGORIES;
          const tierInfo = ACHIEVEMENT_TIERS[rarity];
          const catInfo = ACHIEVEMENT_CATEGORIES[category] || ACHIEVEMENT_CATEGORIES.transactions;

          return (
            <Card key={achievement.id} className={achievement.unlocked ? '' : 'opacity-60'}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: achievement.unlocked ? catInfo.color : '#e5e7eb', boxShadow: achievement.unlocked ? `0 0 20px ${tierInfo.glow}` : 'none' }}>
                    {achievement.unlocked ? achievement.icon : <Lock className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between"><h3 className="font-semibold">{achievement.title}</h3><Badge style={{ backgroundColor: tierInfo.color, color: achievement.rarity === 'legendary' ? '#000' : '#fff' }}>{tierInfo.name}</Badge></div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {!achievement.unlocked && achievement.requirement_value && <div className="mt-2"><Progress value={achievement.percentage} className="h-2" /><p className="text-xs text-muted-foreground mt-1">{achievement.progress} / {achievement.maxProgress}</p></div>}
                    {achievement.unlocked && achievement.unlocked_at && <p className="text-xs text-muted-foreground mt-2">Разблокировано {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <Card className="text-center py-12"><CardContent><Target className="h-12 w-12 mx-auto text-muted-foreground" /><h3 className="text-lg font-semibold mt-2">Нет достижений</h3><p className="text-muted-foreground">Попробуйте другую категорию</p></CardContent></Card>
      )}
    </div>
  );
}
