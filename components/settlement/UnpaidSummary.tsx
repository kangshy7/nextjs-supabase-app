"use client";

// 미납자 현황 요약 컴포넌트 (주최자 전용)
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { sendUnpaidReminder } from "@/app/protected/events/[id]/settlement/actions";
import type { SettlementSummaryItem } from "@/types/settlement";

interface UnpaidSummaryProps {
  summaryItems: SettlementSummaryItem[];
  eventId: string;
}

export function UnpaidSummary({ summaryItems, eventId }: UnpaidSummaryProps) {
  const unpaidItems = summaryItems.filter((item) => item.unpaid_amount > 0);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (unpaidItems.length === 0) return null;

  const totalUnpaid = unpaidItems.reduce((sum, item) => sum + item.unpaid_amount, 0);

  const handleSendReminder = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await sendUnpaidReminder(eventId);
      setMessage({
        type: result.success ? "success" : "error",
        text: result.success ? "리마인더 이메일을 발송했습니다." : (result.error ?? "발송 실패"),
      });
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-orange-800 dark:text-orange-300">
          미납 현황 ({unpaidItems.length}명)
        </h3>
        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
          총 미납액: {totalUnpaid.toLocaleString("ko-KR")}원
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {unpaidItems.map((item) => (
          <div key={item.participant_id} className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.guest_name}</span>
            <span className="text-orange-700 dark:text-orange-400">
              {item.unpaid_amount.toLocaleString("ko-KR")}원 미납
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendReminder}
          disabled={isPending}
          className="self-start border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400"
        >
          {isPending ? "발송 중..." : "이메일 리마인더 발송"}
        </Button>
        {message && (
          <p
            className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-500"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
