"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Target,
  Users,
  Clock,
  CheckCircle2,
  Star,
  Award,
  Medal,
  BarChart3,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface PerformanceData {
  user_id: string;
  tenders_won: number;
  tenders_total: number;
  tasks_completed: number;
  tasks_total: number;
  avg_completion_days: number | null;
  quality_score: number | null;
  on_time_percentage: number | null;
}

interface AnalyticsClientProps {
  employees: Employee[];
  performanceData: PerformanceData[];
}

export function AnalyticsClient({
  employees,
  performanceData,
}: AnalyticsClientProps) {

  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    return employees
      .map((emp) => {
        const perf = performanceData.find((p) => p.user_id === emp.id);
        const winRate = perf && perf.tenders_total > 0
          ? Math.round((perf.tenders_won / perf.tenders_total) * 100)
          : 0;
        const taskCompletionRate = perf && perf.tasks_total > 0
          ? Math.round((perf.tasks_completed / perf.tasks_total) * 100)
          : 0;
        const score = (winRate * 0.4) + (taskCompletionRate * 0.3) + ((perf?.on_time_percentage || 0) * 0.3);

        return {
          ...emp,
          performance: perf,
          winRate,
          taskCompletionRate,
          score: Math.round(score),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [employees, performanceData]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalTenders = performanceData.reduce((sum, p) => sum + p.tenders_total, 0);
    const wonTenders = performanceData.reduce((sum, p) => sum + p.tenders_won, 0);
    const totalTasks = performanceData.reduce((sum, p) => sum + p.tasks_total, 0);
    const completedTasks = performanceData.reduce((sum, p) => sum + p.tasks_completed, 0);
    const avgOnTime = performanceData.length > 0
      ? Math.round(
          performanceData.reduce((sum, p) => sum + (p.on_time_percentage || 0), 0) /
            performanceData.length
        )
      : 0;

    return {
      totalTenders,
      wonTenders,
      winRate: totalTenders > 0 ? Math.round((wonTenders / totalTenders) * 100) : 0,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      avgOnTime,
    };
  }, [performanceData]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">{index + 1}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Выигранные тендеры</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.wonTenders}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={overallStats.winRate} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground">{overallStats.winRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              из {overallStats.totalTenders} всего
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Выполненные задачи</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.completedTasks}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={overallStats.taskCompletionRate} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground">
                {overallStats.taskCompletionRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              из {overallStats.totalTasks} всего
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">В срок</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.avgOnTime}%</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={overallStats.avgOnTime} className="h-2 flex-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">среднее по команде</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Активных сотрудников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">в команде</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4 mr-2" />
            Рейтинг
          </TabsTrigger>
          <TabsTrigger value="details">
            <BarChart3 className="h-4 w-4 mr-2" />
            Детали
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Рейтинг сотрудников
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((emp, index) => (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      index < 3 ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex-shrink-0">{getRankIcon(index)}</div>
                    <Avatar>
                      <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{emp.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{emp.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{emp.winRate}%</p>
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{emp.taskCompletionRate}%</p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{emp.performance?.on_time_percentage || 0}%</p>
                        <p className="text-xs text-muted-foreground">On Time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className={`h-5 w-5 ${getScoreColor(emp.score)}`} />
                      <span className={`text-lg font-bold ${getScoreColor(emp.score)}`}>
                        {emp.score}
                      </span>
                    </div>
                  </div>
                ))}

                {leaderboard.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет данных для отображения</p>
                    <p className="text-sm">Данные появятся после завершения тендеров и задач</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          {leaderboard.length >= 3 && (
            <div className="grid gap-4 md:grid-cols-3">
              {leaderboard.slice(0, 3).map((emp, index) => (
                <Card key={emp.id} className={index === 0 ? "border-yellow-500 border-2" : ""}>
                  <CardContent className="pt-6 text-center">
                    <div className="mb-4">{getRankIcon(index)}</div>
                    <Avatar className="h-16 w-16 mx-auto mb-3">
                      <AvatarFallback className="text-xl">
                        {getInitials(emp.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{emp.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{emp.email}</p>
                    <div className="flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(emp.score / 20)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-2xl font-bold mt-2 ${getScoreColor(emp.score)}`}>
                      {emp.score} баллов
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Detailed Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Детальная статистика
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Сотрудник</th>
                      <th className="text-center py-3 px-4">Тендеры</th>
                      <th className="text-center py-3 px-4">Win Rate</th>
                      <th className="text-center py-3 px-4">Задачи</th>
                      <th className="text-center py-3 px-4">Выполнено</th>
                      <th className="text-center py-3 px-4">В срок</th>
                      <th className="text-center py-3 px-4">Качество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{emp.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          {emp.performance?.tenders_won || 0}/{emp.performance?.tenders_total || 0}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant={emp.winRate >= 50 ? "default" : "secondary"}
                          >
                            {emp.winRate}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          {emp.performance?.tasks_total || 0}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant={emp.taskCompletionRate >= 80 ? "default" : "secondary"}
                          >
                            {emp.taskCompletionRate}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          {emp.performance?.on_time_percentage || 0}%
                        </td>
                        <td className="text-center py-3 px-4">
                          {emp.performance?.quality_score || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leaderboard.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет данных для отображения</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
