"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  acceptParticipant,
  rejectParticipant,
} from "@/app/protected/events/[id]/participants/actions";
import type { ParticipantStatus } from "@/types/participant";

interface ParticipantActionsProps {
  participantId: string;
  currentStatus: ParticipantStatus;
  canAccept: boolean;
}

export function ParticipantActions({
  participantId,
  currentStatus,
  canAccept,
}: ParticipantActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      await acceptParticipant(participantId);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await rejectParticipant(participantId);
    });
  };

  if (currentStatus !== "pending") return null;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={handleAccept}
        disabled={isPending || !canAccept}
        title={!canAccept ? "최대 참여 인원에 도달했습니다" : undefined}
      >
        수락
      </Button>
      <Button size="sm" variant="outline" onClick={handleReject} disabled={isPending}>
        거절
      </Button>
    </div>
  );
}
