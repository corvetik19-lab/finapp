"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./Fitness.module.css";
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadData() {
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
  }

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Фитнес</h1>
        <p className={styles.subtitle}>
          Программы тренировок, упражнения и отслеживание прогресса
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "programs" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("programs")}
        >
          Программы
        </button>
        <button
          className={`${styles.tab} ${activeTab === "exercises" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("exercises")}
        >
          Упражнения
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("history")}
        >
          История
        </button>
        <button
          className={`${styles.tab} ${activeTab === "progress" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("progress")}
        >
          Прогресс
        </button>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <p>Загрузка...</p>
        </div>
      ) : (
        <>
          {activeTab === "programs" && (
            <>
              {programs.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>💪</div>
                  <h2 className={styles.emptyTitle}>Нет программ тренировок</h2>
                  <p className={styles.emptyText}>
                    Создайте свою первую программу тренировок
                  </p>
                  <button className={styles.btnPrimary} onClick={handleCreateProgram}>
                    <span className="material-icons">add</span>
                    Создать программу
                  </button>
                </div>
              ) : (
                <div className={styles.grid}>
                  {programs.map((program) => (
                    <div key={program.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{program.name}</h3>
                        {program.is_active && (
                          <span className={styles.cardBadge}>Активна</span>
                        )}
                      </div>
                      {program.description && (
                        <p className={styles.cardDescription}>{program.description}</p>
                      )}
                      <div className={styles.cardMeta}>
                        {program.goal && (
                          <div className={styles.metaItem}>
                            <span className="material-icons">flag</span>
                            {program.goal}
                          </div>
                        )}
                        <div className={styles.metaItem}>
                          <span className="material-icons">event</span>
                          {program.duration_weeks} недель
                        </div>
                        <div className={styles.metaItem}>
                          <span className="material-icons">fitness_center</span>
                          {program.workouts_per_week}x в неделю
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.btnPrimary}
                          onClick={() => router.push(`/fitness/${program.id}`)}
                        >
                          <span className="material-icons">edit</span>
                          Настроить упражнения
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDeleteProgram(program.id)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "exercises" && (
            <>
              {exercises.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🏋️</div>
                  <h2 className={styles.emptyTitle}>Нет упражнений</h2>
                  <p className={styles.emptyText}>
                    Создайте библиотеку своих упражнений
                  </p>
                  <button className={styles.btnPrimary} onClick={handleCreateExercise}>
                    <span className="material-icons">add</span>
                    Добавить упражнение
                  </button>
                </div>
              ) : (
                <div className={styles.grid}>
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{exercise.name}</h3>
                      </div>
                      {exercise.description && (
                        <p className={styles.cardDescription}>{exercise.description}</p>
                      )}
                      <div className={styles.cardMeta}>
                        {exercise.category && (
                          <div className={styles.metaItem}>
                            <span className="material-icons">category</span>
                            {exercise.category}
                          </div>
                        )}
                        {exercise.equipment && (
                          <div className={styles.metaItem}>
                            <span className="material-icons">construction</span>
                            {exercise.equipment}
                          </div>
                        )}
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDeleteExercise(exercise.id)}
                        >
                          <span className="material-icons">delete</span>
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "history" && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <h2 className={styles.emptyTitle}>История тренировок</h2>
              <p className={styles.emptyText}>
                Здесь будут отображаться ваши тренировки
              </p>
              <p>Тренировок: {sessions.length}</p>
            </div>
          )}

          {activeTab === "progress" && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📈</div>
              <h2 className={styles.emptyTitle}>Прогресс</h2>
              <p className={styles.emptyText}>
                Отслеживайте изменения веса и замеров тела
              </p>
              <p>Замеров: {measurements.length}</p>
            </div>
          )}
        </>
      )}

      <div className={styles.fabContainer}>
        <button
          className={styles.fab}
          onClick={() => {
            if (activeTab === "programs") handleCreateProgram();
            else if (activeTab === "exercises") handleCreateExercise();
          }}
          title="Добавить"
        >
          <span className="material-icons">add</span>
        </button>
      </div>
    </div>
  );
}
