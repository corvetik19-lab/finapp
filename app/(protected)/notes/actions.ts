"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createRouteClient } from "@/lib/supabase/helpers";
import {
  noteLabelFormSchema,
  noteUpsertSchema,
  noteUpdateSchema,
} from "@/lib/notes/schema";

const deleteNoteSchema = z.string().uuid("Некорректная заметка");
const deleteLabelSchema = z.string().uuid("Некорректная метка");

export type CreateNoteInput = z.infer<typeof noteUpsertSchema>;
export type UpdateNoteInput = z.infer<typeof noteUpdateSchema>;

export type NoteActionResult =
  | { success: true }
  | { success: false; error: string };

async function getUserOrThrow() {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Необходима авторизация");

  return { supabase, user };
}

function normalizeNotePayload(input: z.infer<typeof noteUpsertSchema>) {
  const title = input.title && input.title.trim().length > 0 ? input.title.trim() : null;
  const content = input.content.trim();
  const labels = input.labels ?? [];
  const relations = (input.relations ?? []).map((relation) => ({
    entity_type: relation.entityType,
    entity_id: relation.entityId,
  }));

  return { title, content, labels, relations };
}

export async function createNoteAction(rawInput: CreateNoteInput): Promise<NoteActionResult> {
  const parsed = noteUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  try {
    const { supabase, user } = await getUserOrThrow();
    const { title, content, labels, relations } = normalizeNotePayload(parsed.data);

    const {
      data,
      error,
    } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title,
        content,
      })
      .select("id")
      .single();

    if (error) throw error;

    const noteId = data.id as string;

    if (labels.length > 0) {
      const { error: linkError } = await supabase.from("note_label_links").insert(
        labels.map((labelId) => ({
          note_id: noteId,
          label_id: labelId,
          user_id: user.id,
        }))
      );
      if (linkError) throw linkError;
    }

    if (relations.length > 0) {
      const { error: relationError } = await supabase.from("note_relations").insert(
        relations.map((relation) => ({
          note_id: noteId,
          user_id: user.id,
          entity_type: relation.entity_type,
          entity_id: relation.entity_id,
        }))
      );
      if (relationError) throw relationError;
    }

    revalidatePath("/dashboard");
    revalidatePath("/notes");

    return { success: true };
  } catch (error) {
    console.error("createNoteAction", error);
    return { success: false, error: "Не удалось сохранить заметку" };
  }
}

export async function updateNoteAction(rawInput: UpdateNoteInput): Promise<NoteActionResult> {
  const parsed = noteUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  try {
    const { supabase, user } = await getUserOrThrow();
    const { title, content, labels, relations } = normalizeNotePayload(parsed.data);

    const { error } = await supabase
      .from("notes")
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);

    if (error) throw error;

    const { error: deleteLinksError } = await supabase
      .from("note_label_links")
      .delete()
      .eq("note_id", parsed.data.id)
      .eq("user_id", user.id);
    if (deleteLinksError) throw deleteLinksError;

    if (labels.length > 0) {
      const { error: insertLinksError } = await supabase.from("note_label_links").insert(
        labels.map((labelId) => ({
          note_id: parsed.data.id,
          label_id: labelId,
          user_id: user.id,
        }))
      );
      if (insertLinksError) throw insertLinksError;
    }

    const { error: deleteRelationsError } = await supabase
      .from("note_relations")
      .delete()
      .eq("note_id", parsed.data.id)
      .eq("user_id", user.id);
    if (deleteRelationsError) throw deleteRelationsError;

    if (relations.length > 0) {
      const { error: insertRelationsError } = await supabase.from("note_relations").insert(
        relations.map((relation) => ({
          note_id: parsed.data.id,
          user_id: user.id,
          entity_type: relation.entity_type,
          entity_id: relation.entity_id,
        }))
      );
      if (insertRelationsError) throw insertRelationsError;
    }

    revalidatePath("/dashboard");
    revalidatePath("/notes");

    return { success: true };
  } catch (error) {
    console.error("updateNoteAction", error);
    return { success: false, error: "Не удалось обновить заметку" };
  }
}

export async function deleteNoteAction(rawId: string): Promise<NoteActionResult> {
  const parsed = deleteNoteSchema.safeParse(rawId);
  if (!parsed.success) {
    return { success: false, error: "Некорректная заметка" };
  }

  try {
    const { supabase, user } = await getUserOrThrow();

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", parsed.data)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard");
    revalidatePath("/notes");

    return { success: true };
  } catch (error) {
    console.error("deleteNoteAction", error);
    return { success: false, error: "Не удалось удалить заметку" };
  }
}

export type LabelActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createNoteLabelAction(formData: FormData): Promise<LabelActionResult> {
  const name = formData.get("name");
  const color = formData.get("color");

  const parsed = noteLabelFormSchema.safeParse({
    name,
    color,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  try {
    const { supabase, user } = await getUserOrThrow();

    const { error } = await supabase.from("note_labels").insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
    });

    if (error) throw error;

    revalidatePath("/notes");
    return { success: true };
  } catch (error) {
    console.error("createNoteLabelAction", error);
    return { success: false, error: "Не удалось создать метку" };
  }
}

export async function updateNoteLabelAction(id: string, formData: FormData): Promise<LabelActionResult> {
  const name = formData.get("name");
  const color = formData.get("color");

  const parsed = noteLabelFormSchema.safeParse({
    name,
    color,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  try {
    const { supabase, user } = await getUserOrThrow();

    const { error } = await supabase
      .from("note_labels")
      .update({
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/notes");
    return { success: true };
  } catch (error) {
    console.error("updateNoteLabelAction", error);
    return { success: false, error: "Не удалось обновить метку" };
  }
}

export async function deleteNoteLabelAction(rawId: string): Promise<LabelActionResult> {
  const parsed = deleteLabelSchema.safeParse(rawId);
  if (!parsed.success) {
    return { success: false, error: "Некорректная метка" };
  }

  try {
    const { supabase, user } = await getUserOrThrow();

    const { error } = await supabase
      .from("note_labels")
      .delete()
      .eq("id", parsed.data)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/notes");
    return { success: true };
  } catch (error) {
    console.error("deleteNoteLabelAction", error);
    return { success: false, error: "Не удалось удалить метку" };
  }
}
