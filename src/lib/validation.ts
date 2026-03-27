import { z } from "zod";
import { EVENT_TYPES } from "@/types/admin";

const textField = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Field is required.")
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

const optionalSafeText = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .nullable()
  .optional();

export const eventSchema = z.object({
  name: textField(120),
  date: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid event date."),
  event_type: z.enum(EVENT_TYPES),
  points_value: z.number().min(0).max(1000),
  is_open: z.boolean(),
  google_form_url: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value === "none" || /^https?:\/\/.+/i.test(value),
      "Google Form URL must be a valid URL or 'none'."
    ),
  school_year: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "School year must use format YYYY-YYYY.")
});

export const eventPatchSchema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["toggle_open", "delete"]),
  is_open: z.boolean().optional()
});

export const memberPatchSchema = z.object({
  id: z.number().int().positive(),
  first_name: textField(80),
  last_name: textField(80),
  graduation_year: z.number().int().min(1990).max(2100).nullable(),
  graduation_semester: optionalSafeText,
  member_type: z.enum(["student", "GRADUATING", "alumni"]),
  major: optionalSafeText,
  personal_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid personal email.")
    .or(z.literal(""))
    .transform((value) => (value ? value : null))
});

export const officerCreateSchema = z.object({
  member_id: z.number().int().positive(),
  role: textField(100),
  semester: z.enum(["Fall", "Spring", "Year"]),
  school_year: z.string().regex(/^\d{4}-\d{4}$/)
});

export const schoolYearSchema = z.object({
  active_year: z.string().regex(/^\d{4}-\d{4}$/)
});

export function parseJson<T>(payload: unknown, schema: z.ZodType<T>) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues[0]?.message ?? "Invalid request payload."
    };
  }

  return { success: true as const, data: result.data };
}
