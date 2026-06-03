// 비용 분할 목록 및 납부 상태 관리 컴포넌트 (서버 컴포넌트 + 클라이언트 버튼)
import { PaymentToggle } from "@/components/settlement/PaymentToggle";
import type { ExpenseSplit } from "@/types/settlement";

interface SplitWithParticipant extends ExpenseSplit {
  guest_name: string;
}

interface ExpenseSplitListProps {
  splits: SplitWithParticipant[];
  eventId: string;
  isHost: boolean;
}

export function ExpenseSplitList({ splits, eventId, isHost }: ExpenseSplitListProps) {
  if (splits.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">납부 내역이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {splits.map((split) => (
        <div
          key={split.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{split.guest_name}</span>
            <span className="text-xs text-muted-foreground">
              {split.amount.toLocaleString("ko-KR")}원
            </span>
            {split.is_paid && split.paid_at && (
              <span className="text-xs text-green-600">
                납부일:{" "}
                {new Date(split.paid_at).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={
                split.is_paid
                  ? "text-xs font-medium text-green-600"
                  : "text-xs font-medium text-red-500"
              }
            >
              {split.is_paid ? "납부 완료" : "미납"}
            </span>
            {isHost && (
              <PaymentToggle
                splitId={split.id}
                eventId={eventId}
                isPaid={split.is_paid}
                participantName={split.guest_name}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
