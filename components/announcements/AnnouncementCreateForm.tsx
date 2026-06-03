"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  announcementCreateSchema,
  type AnnouncementCreateInput,
} from "@/lib/validations/announcement";
import { createAnnouncement } from "@/app/protected/events/[id]/announcements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AnnouncementCreateFormProps {
  eventId: string;
}

export function AnnouncementCreateForm({ eventId }: AnnouncementCreateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AnnouncementCreateInput>({
    resolver: zodResolver(announcementCreateSchema),
    defaultValues: { title: "", content: "" },
  });

  const content = form.watch("content");

  const onSubmit = async (data: AnnouncementCreateInput) => {
    setIsLoading(true);
    setServerError(null);

    const result = await createAnnouncement(eventId, data as Record<string, unknown>);

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
      <h3 className="font-semibold">새 공지 작성</h3>

      <div className="grid gap-2">
        <Label htmlFor="title">제목 *</Label>
        <Input id="title" placeholder="공지 제목" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">내용 *</Label>
          <span className="text-xs text-muted-foreground">{(content ?? "").length} / 2000</span>
        </div>
        <Textarea
          id="content"
          rows={5}
          placeholder="공지 내용을 입력하세요"
          {...form.register("content")}
        />
        {form.formState.errors.content && (
          <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "등록 중..." : "공지 등록"}
      </Button>
    </form>
  );
}
