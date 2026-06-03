"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { joinFormSchema, type JoinFormInput } from "@/lib/validations/participant";
import { joinEventAction } from "@/app/events/[id]/join/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JoinFormProps {
  eventId: string;
  joinCode: string;
  defaultName?: string;
  defaultEmail?: string;
}

export function JoinForm({ eventId, joinCode, defaultName, defaultEmail }: JoinFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const form = useForm<JoinFormInput>({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      guest_name: defaultName ?? "",
      guest_email: defaultEmail ?? "",
      note: "",
    },
  });

  const onSubmit = async (data: JoinFormInput) => {
    setIsLoading(true);
    setResult(null);

    const res = await joinEventAction(eventId, joinCode, data as Record<string, unknown>);

    if (res.success) {
      setResult({
        success: true,
        message: "참여 신청이 완료되었습니다! 주최자 승인 후 확정됩니다.",
      });
      form.reset();
    } else {
      setResult({ success: false, message: res.error });
    }

    setIsLoading(false);
  };

  if (result?.success) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center text-green-800">
        <p className="text-lg font-medium">✓ 신청 완료</p>
        <p className="mt-1 text-sm">{result.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="guest_name">이름 *</Label>
        <Input id="guest_name" placeholder="홍길동" {...form.register("guest_name")} />
        {form.formState.errors.guest_name && (
          <p className="text-sm text-red-500">{form.formState.errors.guest_name.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="guest_email">이메일 (선택)</Label>
        <Input
          id="guest_email"
          type="email"
          placeholder="example@email.com"
          {...form.register("guest_email")}
        />
        {form.formState.errors.guest_email && (
          <p className="text-sm text-red-500">{form.formState.errors.guest_email.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">메모 (선택)</Label>
        <Textarea
          id="note"
          rows={3}
          placeholder="전달할 내용이 있으면 입력하세요"
          {...form.register("note")}
        />
        {form.formState.errors.note && (
          <p className="text-sm text-red-500">{form.formState.errors.note.message}</p>
        )}
      </div>

      {result && !result.success && <p className="text-sm text-red-500">{result.message}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "신청 중..." : "참여 신청"}
      </Button>
    </form>
  );
}
