"use client";

// 비용 등록 폼 컴포넌트 (RHF + Zod)
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { expenseCreateSchema, type ExpenseCreateInput } from "@/lib/validations/settlement";
import { createExpense } from "@/app/protected/events/[id]/settlement/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Participant {
  id: string;
  guest_name: string;
}

interface ExpenseCreateFormProps {
  eventId: string;
  participants: Participant[];
}

export function ExpenseCreateForm({ eventId, participants }: ExpenseCreateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: { description: "", amount: 0, paid_by: "" },
  });

  const onSubmit = async (data: ExpenseCreateInput) => {
    setIsLoading(true);
    setServerError(null);

    const result = await createExpense(eventId, data as Record<string, unknown>);

    if (result.success) {
      form.reset();
    } else {
      setServerError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <h3 className="font-semibold">비용 추가</h3>

      {/* 설명 */}
      <div className="grid gap-2">
        <Label htmlFor="description">설명 *</Label>
        <Input id="description" placeholder="예: 입장료, 식비" {...form.register("description")} />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      {/* 금액 */}
      <div className="grid gap-2">
        <Label htmlFor="amount">금액 (원) *</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0"
          min={1}
          {...form.register("amount", { valueAsNumber: true })}
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
        )}
      </div>

      {/* 납부자 선택 */}
      <div className="grid gap-2">
        <Label>납부자 *</Label>
        <Select
          onValueChange={(value) => form.setValue("paid_by", value)}
          value={form.watch("paid_by")}
        >
          <SelectTrigger>
            <SelectValue placeholder="납부자 선택" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.guest_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.paid_by && (
          <p className="text-sm text-red-500">{form.formState.errors.paid_by.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "등록 중..." : "비용 등록"}
      </Button>
    </form>
  );
}
