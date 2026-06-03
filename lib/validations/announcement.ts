import { z } from "zod";

export const announcementCreateSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(100, "제목은 100자 이하여야 합니다."),
  content: z.string().min(1, "내용을 입력해 주세요.").max(2000, "내용은 2000자 이하여야 합니다."),
});

export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>;
