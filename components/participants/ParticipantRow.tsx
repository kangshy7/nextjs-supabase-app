import { Badge } from "@/components/ui/badge";
import { ParticipantActions } from "@/components/participants/ParticipantActions";
import { CancelParticipationButton } from "@/components/participants/CancelParticipationButton";
import type { EventParticipant, ParticipantStatus } from "@/types/participant";

const statusConfig: Record<ParticipantStatus, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  accepted: { label: "수락", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  rejected: { label: "거절", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  cancelled: { label: "취소", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

interface ParticipantRowProps {
  participant: EventParticipant;
  isHost: boolean;
  currentAccepted: number;
  maxParticipants: number | null;
  currentUserId: string;
}

export function ParticipantRow({
  participant,
  isHost,
  currentAccepted,
  maxParticipants,
  currentUserId,
}: ParticipantRowProps) {
  const config = statusConfig[participant.status];
  const canAccept = maxParticipants === null || currentAccepted < maxParticipants;

  // 본인 참여 여부 및 취소 가능 상태 판단
  const isMyParticipation = participant.user_id === currentUserId;
  const canCancel =
    isMyParticipation &&
    !isHost &&
    (participant.status === "pending" || participant.status === "accepted");

  const appliedDate = new Date(participant.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{participant.guest_name}</span>
          <Badge className={config.className} variant="secondary">
            {config.label}
          </Badge>
        </div>
        {participant.guest_email && (
          <span className="text-sm text-muted-foreground">{participant.guest_email}</span>
        )}
        <span className="text-xs text-muted-foreground">신청일: {appliedDate}</span>
        {participant.note && (
          <p className="mt-1 rounded bg-muted px-2 py-1 text-sm">{participant.note}</p>
        )}
      </div>

      <div className="flex gap-2">
        {/* 주최자: 수락/거절 버튼 */}
        {isHost && (
          <ParticipantActions
            participantId={participant.id}
            currentStatus={participant.status}
            canAccept={canAccept}
          />
        )}

        {/* 참여자 본인: 취소 버튼 */}
        {canCancel && <CancelParticipationButton participantId={participant.id} />}
      </div>
    </div>
  );
}
