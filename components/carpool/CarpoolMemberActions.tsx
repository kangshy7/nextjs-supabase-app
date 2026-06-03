"use client";

// 카풀 멤버 수락/거절 액션 컴포넌트 (드라이버 전용)
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  acceptCarpoolMember,
  rejectCarpoolMember,
} from "@/app/protected/events/[id]/carpool/actions";
import type { CarpoolMemberStatus } from "@/types/carpool";

interface CarpoolMemberActionsProps {
  memberId: string;
  eventId: string;
  currentStatus: CarpoolMemberStatus;
  memberName: string;
}

export function CarpoolMemberActions({
  memberId,
  eventId,
  currentStatus,
  memberName,
}: CarpoolMemberActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      await acceptCarpoolMember(memberId, eventId);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await rejectCarpoolMember(memberId, eventId);
    });
  };

  if (currentStatus === "accepted") {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
        수락됨
      </span>
    );
  }

  if (currentStatus === "rejected") {
    return (
      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
        거절됨
      </span>
    );
  }

  return (
    <div className="flex gap-2" title={`${memberName} 동승 신청 처리`}>
      <Button size="sm" onClick={handleAccept} disabled={isPending} className="text-xs">
        수락
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleReject}
        disabled={isPending}
        className="text-xs"
      >
        거절
      </Button>
    </div>
  );
}
