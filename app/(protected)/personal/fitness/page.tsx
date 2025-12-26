"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Dumbbell, ListChecks, History, TrendingUp, Flag, Calendar, Trash2, Edit, Loader2 } from "lucide-react";
import {
  getWorkoutPrograms,
  getExercises,
  getWorkoutSessions,
  getBodyMeasurements,
  createWorkoutProgram,
  createExercise,
  deleteWorkoutProgram,
  deleteExercise,
} from "./actions";
import type {
  WorkoutProgram,
  Exercise,
  BodyMeasurement,
} from "@/types/fitness";

type Tab = "programs" | "exercises" | "history" | "progress";

export default function FitnessPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("programs");
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "programs") {
        const data = await getWorkoutPrograms();
        setPrograms(data);
      } else if (activeTab === "exercises") {
        const data = await getExercises();
        setExercises(data);
      } else if (activeTab === "history") {
        const data = await getWorkoutSessions();
        setSessions(data);
      } else if (activeTab === "progress") {
        const data = await getBodyMeasurements();
        setMeasurements(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateProgram() {
    const name = prompt("Название программы:");
    if (!name) return;

    const description = prompt("Описание:");
    const goal = prompt("Цель (Набор массы, Похудение, Сила):");

    try {
      await createWorkoutProgram({
        name,
        description,
        goal,
        duration_weeks: 12,
        workouts_per_week: 3,
        is_active: true,
      });
      loadData();
    } catch (error) {
      console.error("Error creating program:", error);
      alert("Ошибка при создании программы");
    }
  }

  async function handleCreateExercise() {
    const name = prompt("Название упражнения:");
    if (!name) return;

    const category = prompt("Категория (Грудь, Спина, Ноги, Плечи, Руки, Пресс, Кардио):");
    const equipment = prompt("Оборудование (Штанга, Гантели, Тренажёр, Своё тело):");

    try {
      await createExercise({
        name,
        description: null,
        category,
        equipment,
        video_url: null,
        instructions: null,
      });
      loadData();
    } catch (error) {
      console.error("Error creating exercise:", error);
      alert("Ошибка при создании упражнения");
    }
  }

  async function handleDeleteProgram(id: string) {
    if (!confirm("Удалить программу?")) return;
    
    try {
      await deleteWorkoutProgram(id);
      loadData();
    } catch (error) {
      console.error("Error deleting program:", error);
      alert("Ошибка при удалении");
    }
  }

  async function handleDeleteExercise(id: string) {
    if (!confirm("Удалить упражнение?")) return;
    
    try {
      await deleteExercise(id);
      loadData();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      alert("Ошибка при удалении");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Фитнес</h1><p className="text-muted-foreground">Программы тренировок и прогресс</p></div>
        <Button onClick={() => activeTab === "programs" ? handleCreateProgram() : handleCreateExercise()}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="programs"><Dumbbell className="h-4 w-4 mr-1" />Программы</TabsTrigger>
          <TabsTrigger value="exercises"><ListChecks className="h-4 w-4 mr-1" />Упражнения</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" />История</TabsTrigger>
          <TabsTrigger value="progress"><TrendingUp className="h-4 w-4 mr-1" />Прогресс</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : programs.length === 0 ? (
            <Card className="text-center py-12"><CardContent><Dumbbell className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">Нет программ</h2><p className="text-muted-foreground mb-4">Создайте первую программу</p><Button onClick={handleCreateProgram}><Plus className="h-4 w-4 mr-1" />Создать</Button></CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((program) => (
                <Card key={program.id}><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{program.name}</CardTitle>{program.is_active && <Badge>Активна</Badge>}</CardHeader><CardContent>
                  {program.description && <p className="text-sm text-muted-foreground mb-3">{program.description}</p>}
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                    {program.goal && <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{program.goal}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{program.duration_weeks} нед.</span>
                    <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{program.workouts_per_week}x/нед</span>
                  </div>
                  <div className="flex gap-2"><Button size="sm" onClick={() => router.push(`/personal/fitness/${program.id}`)}><Edit className="h-4 w-4 mr-1" />Настроить</Button><Button size="sm" variant="destructive" onClick={() => handleDeleteProgram(program.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercises" className="mt-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : exercises.length === 0 ? (
            <Card className="text-center py-12"><CardContent><ListChecks className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">Нет упражнений</h2><p className="text-muted-foreground mb-4">Создайте библиотеку</p><Button onClick={handleCreateExercise}><Plus className="h-4 w-4 mr-1" />Добавить</Button></CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((exercise) => (
                <Card key={exercise.id}><CardHeader><CardTitle>{exercise.name}</CardTitle></CardHeader><CardContent>
                  {exercise.description && <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>}
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                    {exercise.category && <Badge variant="secondary">{exercise.category}</Badge>}
                    {exercise.equipment && <Badge variant="outline">{exercise.equipment}</Badge>}
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteExercise(exercise.id)}><Trash2 className="h-4 w-4 mr-1" />Удалить</Button>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="text-center py-12"><CardContent><History className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">История тренировок</h2><p className="text-muted-foreground">Тренировок: {sessions.length}</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card className="text-center py-12"><CardContent><TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">Прогресс</h2><p className="text-muted-foreground">Замеров: {measurements.length}</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
