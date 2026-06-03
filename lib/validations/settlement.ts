import { z } from "zod";

export const expenseCreateSchema = z.object({
  description: z
    .string()
    .min(1, "비용 설명을 입력해 주세요.")
    .max(100, "설명은 100자 이하여야 합니다."),
  amount: z
    .number({ error: "금액을 입력해 주세요." })
    .positive("금액은 0보다 커야 합니다.")
    .max(10_000_000, "금액은 천만 원 이하여야 합니다."),
  paid_by: z.string().min(1, "납부자를 선택해 주세요."),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

// 커스텀 분할용 스키마
export const customExpenseSchema = expenseCreateSchema.extend({
  splits: z
    .array(
      z.object({
        participant_id: z.string().min(1),
        amount: z
          .number({ error: "금액을 입력해 주세요." })
          .min(0, "0 이상의 금액을 입력해 주세요."),
      })
    )
    .min(1, "분할 항목이 필요합니다."),
});

export type CustomExpenseInput = z.infer<typeof customExpenseSchema>;
