"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "../Fitness.module.css";
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
    return (
      <div className={styles.container}>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className={styles.container}>
        <p>Программа не найдена</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.btnSecondary} onClick={() => router.back()}>
            <span className="material-icons">arrow_back</span>
            Назад
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.btnPrimary} onClick={() => window.print()}>
            <span className="material-icons">print</span>
            Распечатать
          </button>
          <button className={styles.btnSecondary} onClick={handleToggleActive}>
            <span className="material-icons">
              {program.is_active ? "pause" : "play_arrow"}
            </span>
            {program.is_active ? "Деактивировать" : "Активировать"}
          </button>
        </div>
      </div>

      <div className={styles.programSheet}>
        <div className={styles.programHeader}>
          <h1 className={styles.programTitle}>{program.name}</h1>
          {program.description && (
            <p className={styles.subtitle}>{program.description}</p>
          )}
          <div className={styles.programMeta}>
            {program.goal && (
              <div className={styles.programMetaItem}>
                <span className="material-icons">flag</span>
                <span>{program.goal}</span>
              </div>
            )}
            <div className={styles.programMetaItem}>
              <span className="material-icons">event</span>
              <span>{program.duration_weeks} недель</span>
            </div>
            <div className={styles.programMetaItem}>
              <span className="material-icons">fitness_center</span>
              <span>{program.workouts_per_week} тренировок в неделю</span>
            </div>
            <div className={styles.programMetaItem}>
              <span className="material-icons">list</span>
              <span>{programExercises.length} упражнений</span>
            </div>
          </div>
        </div>

        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const dayExercises = exercisesByDay[day] || [];
          
          return (
            <div key={day} className={styles.daySection}>
              <div className={styles.dayHeader}>
                <h2 className={styles.dayTitle}>День {day}</h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div className={styles.dayBadge}>
                    {dayExercises.length} упражнений
                  </div>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      setSelectedExerciseDay(day);
                      setShowAddExercise(true);
                    }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "white",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: "18px" }}>add</span>
                  </button>
                </div>
              </div>

              {dayExercises.length === 0 ? (
                <div className={styles.emptyDay}>
                  <span className="material-icons">fitness_center</span>
                  <p>Упражнений пока нет</p>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => {
                      setSelectedExerciseDay(day);
                      setShowAddExercise(true);
                    }}
                  >
                    <span className="material-icons">add</span>
                    Добавить упражнение
                  </button>
                </div>
              ) : (
                <ol className={styles.exerciseList}>
                  {dayExercises.map((programEx) => (
                    <li key={programEx.id} className={styles.exerciseItem}>
                      <div className={styles.exerciseNumber}>
                        {programEx.order_index + 1}
                      </div>
                      <div className={styles.exerciseContent}>
                        <h3 className={styles.exerciseName}>
                          {programEx.exercise.name}
                        </h3>
                        <div className={styles.exerciseParams}>
                          <div className={styles.exerciseParam}>
                            <strong>{programEx.sets}×{programEx.reps || "макс"}</strong>
                            {" повторений"}
                          </div>
                        </div>
                        <div className={styles.printWeightLines}>
                          {Array.from({ length: programEx.sets }, (_, i) => (
                            <div key={i} className={styles.printWeightLine}>
                              <span>Подход {i + 1}:</span>
                            </div>
                          ))}
                        </div>
                        {programEx.notes && (
                          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#666" }}>
                            💡 {programEx.notes}
                          </p>
                        )}
                      </div>
                      <div className={styles.exerciseActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleUpdateExercise(programEx.id)}
                          title="Изменить"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.danger}`}
                          onClick={() => handleDeleteExercise(programEx.id)}
                          title="Удалить"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {showAddExercise && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddExercise(false)}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "12px",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Выберите упражнение (День {selectedExerciseDay})</h2>
            {allExercises.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#666" }}>
                <p>Сначала создайте упражнения в библиотеке</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {allExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    className={styles.btnSecondary}
                    onClick={() => handleAddExercise(exercise.id)}
                    style={{ textAlign: "left", padding: "16px" }}
                  >
                    <strong>{exercise.name}</strong>
                    {exercise.category && (
                      <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#666" }}>
                        {exercise.category}
                        {exercise.equipment && ` • ${exercise.equipment}`}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
            <button
              className={styles.btnDanger}
              onClick={() => setShowAddExercise(false)}
              style={{ marginTop: "16px", width: "100%" }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <div className={styles.fabContainer}>
        <button
          className={styles.fab}
          onClick={() => {
            setSelectedExerciseDay(1);
            setShowAddExercise(true);
          }}
          title="Добавить упражнение"
        >
          <span className="material-icons">add</span>
        </button>
      </div>
    </div>
  );
}
