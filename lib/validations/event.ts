import { z } from "zod";

const eventBaseSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(100, "제목은 100자 이하여야 합니다."),
  category: z.enum(["swimming", "fitness", "gathering", "other"]).check((ctx) => {
    if (!ctx.value)
      ctx.issues.push({ code: "custom", message: "카테고리를 선택해 주세요.", input: ctx.value });
  }),
  event_date: z.string().min(1, "날짜를 입력해 주세요."),
  location: z.string().max(200, "장소는 200자 이하여야 합니다.").optional().or(z.literal("")),
  max_participants: z
    .number({ error: "숫자를 입력해 주세요." })
    .int("정수를 입력해 주세요.")
    .positive("1 이상의 값을 입력해 주세요.")
    .optional(),
  description: z.string().optional().or(z.literal("")),
});

export const eventCreateSchema = eventBaseSchema.extend({
  event_date: z
    .string()
    .min(1, "날짜를 입력해 주세요.")
    .refine((val) => new Date(val) > new Date(), {
      message: "과거 날짜는 선택할 수 없습니다.",
    }),
});

export const eventUpdateSchema = eventBaseSchema;

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
