// 카풀 그룹 카드 컴포넌트 (서버 컴포넌트)
import { CarpoolJoinButton } from "@/components/carpool/CarpoolJoinButton";
import { CarpoolMemberActions } from "@/components/carpool/CarpoolMemberActions";
import type { CarpoolMemberStatus } from "@/types/carpool";

interface CarpoolMember {
  id: string;
  participant_id: string;
  status: CarpoolMemberStatus;
  guest_name: string;
}

interface CarpoolGroupCardProps {
  group: {
    id: string;
    driver_id: string;
    driver_name: string;
    departure: string;
    capacity: number;
    memo: string | null;
    created_at: string;
  };
  members: CarpoolMember[];
  eventId: string;
  currentParticipantId: string | null; // 현재 유저의 participant id (null이면 수락된 참여자 아님)
}

export function CarpoolGroupCard({
  group,
  members,
  eventId,
  currentParticipantId,
}: CarpoolGroupCardProps) {
  const acceptedCount = members.filter((m) => m.status === "accepted").length;
  const isFull = acceptedCount >= group.capacity;
  const isDriver = currentParticipantId === group.driver_id;

  // 현재 유저의 신청 상태
  const myMembership = currentParticipantId
    ? members.find((m) => m.participant_id === currentParticipantId)
    : null;
  const alreadyApplied = !!myMembership;

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      {/* 그룹 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{group.departure}</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                isFull ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {acceptedCount}/{group.capacity}명 {isFull ? "만석" : "모집 중"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">드라이버: {group.driver_name}</span>
          {group.memo && <p className="mt-1 rounded bg-muted px-2 py-1 text-sm">{group.memo}</p>}
        </div>

        {/* 동승 신청 버튼 (수락된 참여자만 표시) */}
        {currentParticipantId && (
          <CarpoolJoinButton
            groupId={group.id}
            eventId={eventId}
            isFull={isFull}
            isDriver={isDriver}
            alreadyApplied={alreadyApplied}
          />
        )}
      </div>

      {/* 멤버 목록 */}
      {members.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            신청자
          </h4>
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span>{member.guest_name}</span>

              {/* 드라이버 본인이면 수락/거절 표시 */}
              {isDriver ? (
                <CarpoolMemberActions
                  memberId={member.id}
                  eventId={eventId}
                  currentStatus={member.status}
                  memberName={member.guest_name}
                />
              ) : (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                    member.status === "accepted"
                      ? "bg-green-100 text-green-700"
                      : member.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {member.status === "accepted"
                    ? "수락"
                    : member.status === "rejected"
                      ? "거절"
                      : "대기"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
