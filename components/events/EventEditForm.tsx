"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { eventUpdateSchema, type EventUpdateInput } from "@/lib/validations/event";
import { updateEventAction } from "@/app/protected/events/[id]/edit/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventCategory } from "@/types/event";

const categoryOptions: { value: EventCategory; label: string }[] = [
  { value: "swimming", label: "수영" },
  { value: "fitness", label: "헬스" },
  { value: "gathering", label: "모임" },
  { value: "other", label: "기타" },
];

interface EventEditFormProps {
  eventId: string;
  defaultValues: {
    title: string;
    category: EventCategory;
    event_date: string;
    location: string | null;
    max_participants: number | null;
    description: string | null;
  };
}

export function EventEditForm({ eventId, defaultValues }: EventEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<EventUpdateInput>({
    resolver: zodResolver(eventUpdateSchema),
    defaultValues: {
      title: defaultValues.title,
      category: defaultValues.category,
      event_date: defaultValues.event_date,
      location: defaultValues.location ?? "",
      max_participants: defaultValues.max_participants ?? undefined,
      description: defaultValues.description ?? "",
    },
  });

  const onSubmit = async (data: EventUpdateInput) => {
    setIsLoading(true);
    setServerError(null);

    const result = await updateEventAction(eventId, data as Record<string, unknown>);

    if (result && !result.success) {
      setServerError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>이벤트 수정</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="title">제목 *</Label>
            <Input id="title" placeholder="이벤트 제목을 입력하세요" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">카테고리 *</Label>
            <Select
              defaultValue={defaultValues.category}
              onValueChange={(val) =>
                form.setValue("category", val as EventCategory, { shouldValidate: true })
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event_date">날짜 및 시간 *</Label>
            <Input id="event_date" type="datetime-local" {...form.register("event_date")} />
            {form.formState.errors.event_date && (
              <p className="text-sm text-red-500">{form.formState.errors.event_date.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">장소</Label>
            <Input id="location" placeholder="장소를 입력하세요" {...form.register("location")} />
            {form.formState.errors.location && (
              <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max_participants">최대 참여 인원</Label>
            <Input
              id="max_participants"
              type="number"
              min={1}
              placeholder="제한 없으면 비워두세요"
              {...form.register("max_participants", { valueAsNumber: true })}
            />
            {form.formState.errors.max_participants && (
              <p className="text-sm text-red-500">
                {form.formState.errors.max_participants.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="이벤트 설명을 입력하세요"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "저장 중..." : "저장하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
