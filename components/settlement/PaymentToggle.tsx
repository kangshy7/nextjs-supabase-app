"use client";

// 납부 완료/미납 토글 버튼 컴포넌트 (주최자 전용)
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { togglePayment } from "@/app/protected/events/[id]/settlement/actions";

interface PaymentToggleProps {
  splitId: string;
  eventId: string;
  isPaid: boolean;
  participantName: string;
}

export function PaymentToggle({ splitId, eventId, isPaid, participantName }: PaymentToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await togglePayment(splitId, eventId);
    });
  };

  return (
    <Button
      size="sm"
      variant={isPaid ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isPending}
      title={`${participantName} 납부 상태 변경`}
      className="text-xs"
    >
      {isPending ? "처리 중..." : isPaid ? "납부 취소" : "납부 확인"}
    </Button>
  );
}
