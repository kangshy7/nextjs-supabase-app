// 개인별 납부 요약 테이블 컴포넌트 (서버 컴포넌트)
import type { SettlementSummaryItem } from "@/types/settlement";

interface SplitSummaryTableProps {
  summaryItems: SettlementSummaryItem[];
}

export function SplitSummaryTable({ summaryItems }: SplitSummaryTableProps) {
  if (summaryItems.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">정산 내역이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">참여자</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">총액</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">납부 완료</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">미납</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">상태</th>
          </tr>
        </thead>
        <tbody>
          {summaryItems.map((item, index) => {
            const isFullyPaid = item.unpaid_amount === 0;

            return (
              <tr key={item.participant_id} className={index % 2 === 0 ? "" : "bg-muted/20"}>
                <td className="px-4 py-3 font-medium">{item.guest_name}</td>
                <td className="px-4 py-3 text-right">
                  {item.total_amount.toLocaleString("ko-KR")}원
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {item.paid_amount.toLocaleString("ko-KR")}원
                </td>
                <td className="px-4 py-3 text-right text-red-500">
                  {item.unpaid_amount.toLocaleString("ko-KR")}원
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      isFullyPaid
                        ? "inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                        : "inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                    }
                  >
                    {isFullyPaid ? "납부 완료" : "미납"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
