import { z } from "zod";

export const carpoolGroupCreateSchema = z.object({
  departure: z
    .string()
    .min(1, "출발지를 입력해 주세요.")
    .max(100, "출발지는 100자 이하여야 합니다."),
  capacity: z
    .number({ error: "정원을 입력해 주세요." })
    .int("정수를 입력해 주세요.")
    .min(1, "정원은 최소 1명이어야 합니다.")
    .max(8, "정원은 최대 8명이어야 합니다."),
  memo: z.string().max(200, "메모는 200자 이하여야 합니다.").optional().or(z.literal("")),
});

export type CarpoolGroupCreateInput = z.infer<typeof carpoolGroupCreateSchema>;
