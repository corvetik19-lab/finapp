"use server";

import { createRSCClient } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";
import type {
  WorkoutProgram,
  Exercise,
  WorkoutSession,
  BodyMeasurement,
  ProgramExercise,
} from "@/types/fitness";

// ==================== Программы тренировок ====================

export async function getWorkoutPrograms() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkoutProgram[];
}

export async function createWorkoutProgram(program: Omit<WorkoutProgram, "id" | "user_id" | "created_at" | "updated_at">) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("workout_programs")
    .insert({
      ...program,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as WorkoutProgram;
}

export async function updateWorkoutProgram(id: string, updates: Partial<WorkoutProgram>) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("workout_programs")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as WorkoutProgram;
}

export async function deleteWorkoutProgram(id: string) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("workout_programs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
}

// ==================== Упражнения ====================

export async function getExercises() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Exercise[];
}

export async function createExercise(exercise: Omit<Exercise, "id" | "user_id" | "created_at">) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      ...exercise,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as Exercise;
}

export async function deleteExercise(id: string) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
}

// ==================== Тренировочные сессии ====================

export async function getWorkoutSessions(limit = 30) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      *,
      program:workout_programs(*)
    `)
    .eq("user_id", user.id)
    .order("session_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createWorkoutSession(session: Omit<WorkoutSession, "id" | "user_id" | "created_at">) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      ...session,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as WorkoutSession;
}

export async function deleteWorkoutSession(id: string) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
}

// ==================== Замеры тела ====================

export async function getBodyMeasurements(limit = 50) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("measurement_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data as BodyMeasurement[];
}

export async function createBodyMeasurement(measurement: Omit<BodyMeasurement, "id" | "user_id" | "created_at">) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("body_measurements")
    .insert({
      ...measurement,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as BodyMeasurement;
}

export async function deleteBodyMeasurement(id: string) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("body_measurements")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
}

// ==================== Упражнения в программе ====================

export async function getProgramExercises(programId: string) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("program_exercises")
    .select(`
      *,
      exercise:exercises(*)
    `)
    .eq("program_id", programId)
    .eq("user_id", user.id)
    .order("day_number", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addExerciseToProgram(exercise: Omit<ProgramExercise, "id" | "user_id" | "created_at">) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("program_exercises")
    .insert({
      ...exercise,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as ProgramExercise;
}

export async function updateProgramExercise(id: string, updates: Partial<ProgramExercise>) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("program_exercises")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
  return data as ProgramExercise;
}

export async function deleteProgramExercise(id: string) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("program_exercises")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/personal/fitness");
}
