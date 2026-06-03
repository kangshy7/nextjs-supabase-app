"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { eventCreateSchema, type EventCreateInput } from "@/lib/validations/event";
import { createEventAction } from "@/app/protected/events/new/actions";
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

const categoryOptions = [
  { value: "swimming", label: "수영" },
  { value: "fitness", label: "헬스" },
  { value: "gathering", label: "모임" },
  { value: "other", label: "기타" },
] as const;

export function EventCreateForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<EventCreateInput>({
    resolver: zodResolver(eventCreateSchema),
    defaultValues: {
      title: "",
      location: "",
      description: "",
    },
  });

  const onSubmit = async (data: EventCreateInput) => {
    setIsLoading(true);
    setServerError(null);

    const result = await createEventAction(data as Record<string, unknown>);

    if (result && !result.success) {
      setServerError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 이벤트 만들기</CardTitle>
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
              onValueChange={(val) =>
                form.setValue("category", val as EventCreateInput["category"], {
                  shouldValidate: true,
                })
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
            {isLoading ? "생성 중..." : "이벤트 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
