"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Printer, Play, Pause, Flag, Calendar, Dumbbell, List, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import {
  getWorkoutPrograms,
  getProgramExercises,
  getExercises,
  addExerciseToProgram,
  updateProgramExercise,
  deleteProgramExercise,
  updateWorkoutProgram,
} from "../actions";
import type { WorkoutProgram, Exercise, ProgramExerciseWithDetails } from "@/types/fitness";

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [programExercises, setProgramExercises] = useState<ProgramExerciseWithDetails[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedExerciseDay, setSelectedExerciseDay] = useState(1);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function loadData() {
    setLoading(true);
    try {
      const [programs, exercises, programExs] = await Promise.all([
        getWorkoutPrograms(),
        getExercises(),
        getProgramExercises(programId),
      ]);

      const currentProgram = programs.find((p) => p.id === programId);
      setProgram(currentProgram || null);
      setAllExercises(exercises);
      setProgramExercises(programExs as ProgramExerciseWithDetails[]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExercise(exerciseId: string) {
    if (!program) return;

    const sets = prompt("Количество подходов:", "3");
    if (!sets) return;

    const reps = prompt("Количество повторений:", "10");
    if (!reps) return;

    try {
      await addExerciseToProgram({
        program_id: programId,
        exercise_id: exerciseId,
        day_number: selectedExerciseDay,
        order_index: programExercises.filter((e) => e.day_number === selectedExerciseDay).length,
        sets: parseInt(sets),
        reps: parseInt(reps),
        target_weight_kg: null,
        rest_seconds: 60,
        notes: null,
      });
      loadData();
      setShowAddExercise(false);
    } catch (error) {
      console.error("Error adding exercise:", error);
      alert("Ошибка при добавлении упражнения");
    }
  }

  async function handleDeleteExercise(id: string) {
    if (!confirm("Удалить упражнение из программы?")) return;

    try {
      await deleteProgramExercise(id);
      loadData();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      alert("Ошибка при удалении");
    }
  }

  async function handleUpdateExercise(id: string) {
    const exercise = programExercises.find((e) => e.id === id);
    if (!exercise) return;

    const sets = prompt("Количество подходов:", String(exercise.sets));
    if (!sets) return;

    const reps = prompt("Количество повторений:", String(exercise.reps || ""));
    if (!reps) return;

    try {
      await updateProgramExercise(id, {
        sets: parseInt(sets),
        reps: parseInt(reps),
      });
      loadData();
    } catch (error) {
      console.error("Error updating exercise:", error);
      alert("Ошибка при обновлении");
    }
  }

  async function handleToggleActive() {
    if (!program) return;

    try {
      await updateWorkoutProgram(programId, { is_active: !program.is_active });
      loadData();
    } catch (error) {
      console.error("Error toggling active:", error);
    }
  }

  const days = program?.workouts_per_week || 3;
  
  // Группируем упражнения по дням
  const exercisesByDay: { [key: number]: ProgramExerciseWithDetails[] } = {};
  for (let i = 1; i <= days; i++) {
    exercisesByDay[i] = programExercises.filter((e) => e.day_number === i);
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!program) {
    return <div className="p-6 text-center text-muted-foreground">Программа не найдена</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Назад</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Печать</Button>
          <Button variant={program.is_active ? "secondary" : "default"} onClick={handleToggleActive}>{program.is_active ? <><Pause className="h-4 w-4 mr-2" />Деактивировать</> : <><Play className="h-4 w-4 mr-2" />Активировать</>}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          {program.description && <p className="text-muted-foreground">{program.description}</p>}
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            {program.goal && <span className="flex items-center gap-1"><Flag className="h-4 w-4" />{program.goal}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{program.duration_weeks} недель</span>
            <span className="flex items-center gap-1"><Dumbbell className="h-4 w-4" />{program.workouts_per_week} трен/нед</span>
            <span className="flex items-center gap-1"><List className="h-4 w-4" />{programExercises.length} упражнений</span>
          </div>
        </CardHeader>
      </Card>

      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const dayExercises = exercisesByDay[day] || [];
        return (
          <Card key={day}>
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle>День {day}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{dayExercises.length} упр.</Badge>
                  <Button size="icon" variant="secondary" onClick={() => { setSelectedExerciseDay(day); setShowAddExercise(true); }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {dayExercises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Dumbbell className="h-8 w-8 mx-auto mb-2" /><p>Упражнений пока нет</p><Button className="mt-4" onClick={() => { setSelectedExerciseDay(day); setShowAddExercise(true); }}><Plus className="h-4 w-4 mr-2" />Добавить</Button></div>
              ) : (
                <ol className="space-y-3">
                  {dayExercises.map((programEx) => (
                    <li key={programEx.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{programEx.order_index + 1}</div>
                      <div className="flex-1">
                        <h3 className="font-medium">{programEx.exercise.name}</h3>
                        <p className="text-sm text-muted-foreground"><strong>{programEx.sets}×{programEx.reps || "макс"}</strong> повторений</p>
                        <div className="mt-2 space-y-1 print:block hidden">{Array.from({ length: programEx.sets }, (_, i) => (<div key={i} className="text-xs border-b pb-1">Подход {i + 1}: _____ кг</div>))}</div>
                        {programEx.notes && <p className="text-sm text-muted-foreground mt-1">💡 {programEx.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleUpdateExercise(programEx.id)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteExercise(programEx.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent><DialogHeader><DialogTitle>Выберите упражнение (День {selectedExerciseDay})</DialogTitle></DialogHeader>
          {allExercises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Сначала создайте упражнения в библиотеке</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {allExercises.map((exercise) => (
                <Button key={exercise.id} variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleAddExercise(exercise.id)}>
                  <div className="text-left"><strong>{exercise.name}</strong>{exercise.category && <p className="text-xs text-muted-foreground">{exercise.category}{exercise.equipment && ` • ${exercise.equipment}`}</p>}</div>
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Button className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg" onClick={() => { setSelectedExerciseDay(1); setShowAddExercise(true); }}><Plus className="h-6 w-6" /></Button>
    </div>
  );
}
