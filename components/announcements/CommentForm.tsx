"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { commentCreateSchema, type CommentCreateInput } from "@/lib/validations/comment";
import { createComment } from "@/app/protected/events/[id]/announcements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CommentFormProps {
  announcementId: string;
  eventId: string;
}

export function CommentForm({ announcementId, eventId }: CommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CommentCreateInput>({
    resolver: zodResolver(commentCreateSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = (data: CommentCreateInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createComment(announcementId, eventId, data as Record<string, unknown>);
      if (result.success) {
        form.reset();
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
      <Input
        placeholder="댓글을 입력하세요..."
        className="text-sm"
        {...form.register("content")}
        disabled={isPending}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "..." : "등록"}
      </Button>
      {serverError && <p className="absolute mt-8 text-xs text-red-500">{serverError}</p>}
    </form>
  );
}
