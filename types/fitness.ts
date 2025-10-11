// Типы для модуля Фитнес

export type WorkoutProgram = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  goal: string | null;
  duration_weeks: number | null;
  workouts_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null; // "Грудь", "Спина", "Ноги", "Плечи", "Руки", "Пресс", "Кардио"
  equipment: string | null; // "Штанга", "Гантели", "Тренажёр", "Своё тело", "Кардио"
  video_url: string | null;
  instructions: string | null;
  created_at: string;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  program_id: string | null;
  session_date: string;
  duration_minutes: number | null;
  notes: string | null;
  mood: string | null; // "Отлично", "Хорошо", "Нормально", "Плохо"
  energy_level: number | null; // 1-5
  completed: boolean;
  created_at: string;
};

export type ExerciseSet = {
  id: string;
  user_id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rest_seconds: number | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
};

export type BodyMeasurement = {
  id: string;
  user_id: string;
  measurement_date: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  biceps_cm: number | null;
  thighs_cm: number | null;
  notes: string | null;
  created_at: string;
};

// Типы для UI
export type WorkoutSessionWithDetails = WorkoutSession & {
  program?: WorkoutProgram;
  sets: (ExerciseSet & { exercise: Exercise })[];
};

export type ExerciseCategory =
  | "Грудь"
  | "Спина"
  | "Ноги"
  | "Плечи"
  | "Руки"
  | "Пресс"
  | "Кардио";

export type Equipment =
  | "Штанга"
  | "Гантели"
  | "Тренажёр"
  | "Своё тело"
  | "Кардио";

export type Mood = "Отлично" | "Хорошо" | "Нормально" | "Плохо";

// Упражнения в программе тренировок
export type ProgramExercise = {
  id: string;
  user_id: string;
  program_id: string;
  exercise_id: string;
  day_number: number; // День в программе (1, 2, 3...)
  order_index: number; // Порядок упражнения в день
  sets: number; // Количество подходов
  reps: number | null; // Количество повторений
  target_weight_kg: number | null; // Целевой вес
  rest_seconds: number; // Отдых между подходами в секундах
  notes: string | null;
  created_at: string;
};

// Упражнение в программе с деталями упражнения
export type ProgramExerciseWithDetails = ProgramExercise & {
  exercise: Exercise;
};
