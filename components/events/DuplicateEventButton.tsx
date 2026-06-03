"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { duplicateEvent } from "@/app/protected/events/[id]/actions";

interface DuplicateEventButtonProps {
  eventId: string;
}

export function DuplicateEventButton({ eventId }: DuplicateEventButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDuplicate = () => {
    if (!confirm("이벤트를 복사하시겠습니까?\n날짜는 7일 후로 설정됩니다.")) return;

    startTransition(async () => {
      await duplicateEvent(eventId);
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isPending}>
      {isPending ? "복사 중..." : "이벤트 복사"}
    </Button>
  );
}
