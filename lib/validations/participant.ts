import { z } from "zod";

export const joinFormSchema = z.object({
  guest_name: z.string().min(1, "이름을 입력해 주세요.").max(50, "이름은 50자 이하여야 합니다."),
  guest_email: z.string().email("올바른 이메일 형식을 입력해 주세요.").optional().or(z.literal("")),
  note: z.string().max(200, "메모는 200자 이하여야 합니다.").optional().or(z.literal("")),
});

export type JoinFormInput = z.infer<typeof joinFormSchema>;
