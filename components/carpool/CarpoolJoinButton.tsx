"use client";

// 카풀 동승 신청 버튼 컴포넌트
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinCarpoolGroup } from "@/app/protected/events/[id]/carpool/actions";

interface CarpoolJoinButtonProps {
  groupId: string;
  eventId: string;
  isFull: boolean;
  isDriver: boolean;
  alreadyApplied: boolean;
}

export function CarpoolJoinButton({
  groupId,
  eventId,
  isFull,
  isDriver,
  alreadyApplied,
}: CarpoolJoinButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    startTransition(async () => {
      await joinCarpoolGroup(groupId, eventId);
    });
  };

  // 드라이버 본인 그룹
  if (isDriver) {
    return <span className="text-xs text-muted-foreground">내 그룹</span>;
  }

  // 이미 신청한 경우
  if (alreadyApplied) {
    return (
      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
        신청됨
      </span>
    );
  }

  // 만석
  if (isFull) {
    return (
      <Button size="sm" disabled variant="outline" className="text-xs">
        만석
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleJoin} disabled={isPending} className="text-xs">
      {isPending ? "신청 중..." : "동승 신청"}
    </Button>
  );
}
