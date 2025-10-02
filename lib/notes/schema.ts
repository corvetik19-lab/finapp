import { z } from "zod";

const titleSchema = z
  .string()
  .trim()
  .max(120, "Заголовок не должен превышать 120 символов")
  .optional();

const contentSchema = z
  .string()
  .trim()
  .min(1, "Введите текст заметки")
  .max(4000, "Заметка не должна превышать 4000 символов");
export const noteFormSchema = z.object({
  title: titleSchema,
  content: contentSchema,
});

export type NoteFormInput = z.input<typeof noteFormSchema>;
export type NoteFormValues = z.infer<typeof noteFormSchema>;

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Цвет укажите в формате HEX");

export const noteLabelFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Введите название")
    .max(64, "Название не должно превышать 64 символов"),
  color: z
    .union([hexColorSchema, z.literal("")])
    .optional()
    .transform((value) => {
      if (!value || value === "") {
        return undefined;
      }
      return value;
    }),
});

const entityTypeEnum = z.enum(["transaction", "plan"]);

export const noteRelationSchema = z.object({
  entityType: entityTypeEnum,
  entityId: z.string().uuid("Некорректный идентификатор сущности"),
});

export type NoteRelationInput = z.input<typeof noteRelationSchema>;
export type NoteRelationValues = z.infer<typeof noteRelationSchema>;

export const noteUpsertSchema = noteFormSchema.extend({
  labels: z.array(z.string().uuid("Некорректная метка")).optional(),
  relations: z.array(noteRelationSchema).optional(),
});

export type NoteUpsertInput = z.input<typeof noteUpsertSchema>;
export type NoteUpsertValues = z.infer<typeof noteUpsertSchema>;

export const noteUpdateSchema = noteUpsertSchema.extend({
  id: z.string().uuid("Некорректная заметка"),
});

export type NoteUpdateInput = z.input<typeof noteUpdateSchema>;
export type NoteUpdateValues = z.infer<typeof noteUpdateSchema>;
