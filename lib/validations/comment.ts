import { z } from "zod";

export const commentCreateSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용을 입력해 주세요.")
    .max(500, "댓글은 500자 이하여야 합니다."),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
