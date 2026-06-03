"use client";

// 본인 참여 취소 버튼 (참여자 본인만)
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelParticipation } from "@/app/protected/events/[id]/participants/actions";

interface CancelParticipationButtonProps {
  participantId: string;
}

export function CancelParticipationButton({ participantId }: CancelParticipationButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm("참여를 취소하시겠습니까?")) return;

    startTransition(async () => {
      await cancelParticipation(participantId);
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCancel}
      disabled={isPending}
      className="border-red-200 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
    >
      {isPending ? "취소 중..." : "참여 취소"}
    </Button>
  );
}
