"use client";

// 비용 등록 폼 컴포넌트 (균등/커스텀 분할 지원)
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
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
import type { SplitType } from "@/types/settlement";

interface Participant {
  id: string;
  guest_name: string;
}

interface ExpenseCreateFormProps {
  eventId: string;
  participants: Participant[];
}

interface CustomSplitField {
  participant_id: string;
  amount: number;
}

export function ExpenseCreateForm({ eventId, participants }: ExpenseCreateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customSplits, setCustomSplits] = useState<CustomSplitField[]>(
    participants.map((p) => ({ participant_id: p.id, amount: 0 }))
  );

  const form = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: { description: "", amount: 0, paid_by: "" },
  });

  const watchedAmount = form.watch("amount");

  // 커스텀 분할 합계 실시간 계산
  const customTotal = customSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const isCustomValid = Math.abs(customTotal - (watchedAmount || 0)) <= 0.01;

  // 균등 분할 선택 시 customSplits 금액 자동 초기화
  useEffect(() => {
    if (splitType === "equal") {
      setCustomSplits(participants.map((p) => ({ participant_id: p.id, amount: 0 })));
    }
  }, [splitType, participants]);

  const onSubmit = async (data: ExpenseCreateInput) => {
    setIsLoading(true);
    setServerError(null);

    const payload: Record<string, unknown> = { ...data, splitType };

    if (splitType === "custom") {
      if (!isCustomValid) {
        setServerError(
          `분할 합계(${customTotal.toLocaleString()}원)가 총 금액(${(data.amount || 0).toLocaleString()}원)과 일치해야 합니다.`
        );
        setIsLoading(false);
        return;
      }
      payload.splits = customSplits;
    }

    const result = await createExpense(eventId, payload);

    if (result.success) {
      form.reset();
      setCustomSplits(participants.map((p) => ({ participant_id: p.id, amount: 0 })));
      setSplitType("equal");
    } else {
      setServerError(result.error);
    }

    setIsLoading(false);
  };

  const updateCustomAmount = (participantId: string, amount: number) => {
    setCustomSplits((prev) =>
      prev.map((s) => (s.participant_id === participantId ? { ...s, amount } : s))
    );
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

      {/* 분할 방식 선택 */}
      <div className="grid gap-2">
        <Label>분할 방식</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={splitType === "equal" ? "default" : "outline"}
            onClick={() => setSplitType("equal")}
          >
            균등 분할
          </Button>
          <Button
            type="button"
            size="sm"
            variant={splitType === "custom" ? "default" : "outline"}
            onClick={() => setSplitType("custom")}
          >
            직접 입력
          </Button>
        </div>
      </div>

      {/* 커스텀 분할 입력 */}
      {splitType === "custom" && (
        <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
          <p className="text-sm font-medium">참여자별 금액 입력</p>
          {participants.map((p) => {
            const split = customSplits.find((s) => s.participant_id === p.id);
            return (
              <div key={p.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm">{p.guest_name}</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={split?.amount || 0}
                  onChange={(e) => updateCustomAmount(p.id, Number(e.target.value))}
                  className="h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">원</span>
              </div>
            );
          })}
          <div
            className={`mt-1 text-sm font-medium ${isCustomValid ? "text-green-600" : "text-red-500"}`}
          >
            합계: {customTotal.toLocaleString()}원
            {watchedAmount > 0 && !isCustomValid && (
              <span className="ml-2 text-xs">
                (총액 {watchedAmount.toLocaleString()}원과 불일치)
              </span>
            )}
          </div>
        </div>
      )}

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "등록 중..." : "비용 등록"}
      </Button>
    </form>
  );
}
