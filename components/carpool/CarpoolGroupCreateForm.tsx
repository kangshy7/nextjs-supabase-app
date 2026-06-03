"use client";

// 카풀 그룹 생성 폼 (수락된 참여자만 접근 가능)
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { carpoolGroupCreateSchema, type CarpoolGroupCreateInput } from "@/lib/validations/carpool";
import { createCarpoolGroup } from "@/app/protected/events/[id]/carpool/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CarpoolGroupCreateFormProps {
  eventId: string;
}

export function CarpoolGroupCreateForm({ eventId }: CarpoolGroupCreateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<CarpoolGroupCreateInput>({
    resolver: zodResolver(carpoolGroupCreateSchema),
    defaultValues: { departure: "", capacity: 4, memo: "" },
  });

  const onSubmit = async (data: CarpoolGroupCreateInput) => {
    setIsLoading(true);
    setServerError(null);

    const result = await createCarpoolGroup(eventId, data as Record<string, unknown>);

    if (result.success) {
      form.reset();
      setIsOpen(false);
    } else {
      setServerError(result.error);
    }

    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full sm:w-auto">
        + 카풀 그룹 개설
      </Button>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">카풀 그룹 개설</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </button>
      </div>

      {/* 출발지 */}
      <div className="grid gap-2">
        <Label htmlFor="departure">출발지 *</Label>
        <Input id="departure" placeholder="예: 강남역 2번 출구" {...form.register("departure")} />
        {form.formState.errors.departure && (
          <p className="text-sm text-red-500">{form.formState.errors.departure.message}</p>
        )}
      </div>

      {/* 정원 */}
      <div className="grid gap-2">
        <Label htmlFor="capacity">정원 (1~8명) *</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          max={8}
          {...form.register("capacity", { valueAsNumber: true })}
        />
        {form.formState.errors.capacity && (
          <p className="text-sm text-red-500">{form.formState.errors.capacity.message}</p>
        )}
      </div>

      {/* 메모 */}
      <div className="grid gap-2">
        <Label htmlFor="memo">메모 (선택)</Label>
        <Textarea
          id="memo"
          rows={2}
          placeholder="출발 시간, 경유지 등 추가 정보"
          {...form.register("memo")}
        />
        {form.formState.errors.memo && (
          <p className="text-sm text-red-500">{form.formState.errors.memo.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "생성 중..." : "그룹 개설"}
      </Button>
    </form>
  );
}
