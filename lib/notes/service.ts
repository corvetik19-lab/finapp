import { z } from "zod";

import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { noteLabelFormSchema } from "@/lib/notes/schema";

export type NoteRecord = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteLabel = {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteRelation = {
  id: string;
  entity_type: "transaction" | "plan";
  entity_id: string;
  created_at: string;
};

export type NoteListItem = NoteRecord & {
  labels: NoteLabel[];
  relations: NoteRelation[];
};

export type NoteListFilters = {
  query?: string;
  page?: number;
  pageSize?: number;
  labelIds?: string[];
  entityType?: NoteRelation["entity_type"];
  entityId?: string;
};

const querySchema = z.object({
  query: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  entityType: z.enum(["transaction", "plan"]).optional(),
  entityId: z.string().uuid().optional(),
});

export async function listRecentNotes(limit = 5): Promise<NoteRecord[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("notes")
    .select("id,title,content,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }

  return (data ?? []) as NoteRecord[];
}

export async function listNotes(filters: NoteListFilters = {}): Promise<{ data: NoteListItem[]; count: number }> {
  const parsed = querySchema.safeParse(filters);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Некорректные параметры списка заметок");
  }

  const { page = 1, pageSize = 20, query, labelIds, entityType, entityId } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createRSCClient();

  let queryBuilder = supabase
    .from("notes")
    .select(
      `
        id,
        title,
        content,
        created_at,
        updated_at,
        note_label_links:note_label_links(
          label:note_labels(id,name,color,created_at,updated_at)
        ),
        note_relations(id,entity_type,entity_id,created_at)
      `,
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (query && query.trim() !== "") {
    const pattern = `%${query.trim()}%`;
    queryBuilder = queryBuilder.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  if (labelIds && labelIds.length > 0) {
    const list = labelIds.join(",");
    queryBuilder = queryBuilder.filter("note_label_links!inner.label_id", "in", `(${list})`);
  }

  if (entityType) {
    queryBuilder = queryBuilder.eq("note_relations!inner.entity_type", entityType);
    if (entityId) {
      queryBuilder = queryBuilder.eq("note_relations.entity_id", entityId);
    }
  } else if (entityId) {
    queryBuilder = queryBuilder.eq("note_relations!inner.entity_id", entityId);
  }

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw error;
  }

  const items = (data ?? []).map((item) => {
    const noteLabelLinks = ((item as Record<string, unknown>).note_label_links ?? []) as {
      label?: NoteLabel | NoteLabel[] | null;
    }[];

    const labels: NoteLabel[] = [];
    for (const link of noteLabelLinks) {
      const value = link.label;
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry) labels.push(entry as NoteLabel);
        }
      } else if (value) {
        labels.push(value as NoteLabel);
      }
    }

    const relations = ((item as Record<string, unknown>).note_relations ?? []) as NoteRelation[];

    return {
      id: (item as NoteRecord).id,
      title: (item as NoteRecord).title,
      content: (item as NoteRecord).content,
      created_at: (item as NoteRecord).created_at,
      updated_at: (item as NoteRecord).updated_at,
      labels,
      relations,
    } satisfies NoteListItem;
  });

  return { data: items, count: count ?? 0 };
}

export async function listNoteLabels(): Promise<NoteLabel[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("note_labels")
    .select("id,name,color,created_at,updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as NoteLabel[];
}

export type NoteLabelInput = z.input<typeof noteLabelFormSchema>;

export async function createNoteLabel(input: NoteLabelInput): Promise<NoteLabel> {
  const parsed = noteLabelFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Некорректные данные метки");
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Необходима авторизация");
  }

  const { data, error } = await supabase
    .from("note_labels")
    .insert({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      user_id: user.id,
    })
    .select("id,name,color,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as NoteLabel;
}

export async function updateNoteLabel(id: string, input: NoteLabelInput): Promise<NoteLabel> {
  const parsed = noteLabelFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Некорректные данные метки");
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Необходима авторизация");
  }

  const { data, error } = await supabase
    .from("note_labels")
    .update({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,name,color,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as NoteLabel;
}

export async function deleteNoteLabel(id: string): Promise<void> {
  const supabase = await createRouteClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Необходима авторизация");
  }

  const { error } = await supabase.from("note_labels").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw error;
  }
}
