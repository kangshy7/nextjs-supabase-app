// 비용 목록 테이블 컴포넌트 (서버 컴포넌트)
import type { ExpenseWithPayer } from "@/types/settlement";

interface ExpenseTableProps {
  expenses: ExpenseWithPayer[];
}

export function ExpenseTable({ expenses }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">등록된 비용이 없습니다.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">설명</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">금액</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">납부자</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">등록일</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, index) => (
            <tr key={expense.id} className={index % 2 === 0 ? "" : "bg-muted/20"}>
              <td className="px-4 py-3">{expense.description}</td>
              <td className="px-4 py-3 text-right font-medium">
                {expense.amount.toLocaleString("ko-KR")}원
              </td>
              <td className="px-4 py-3 text-muted-foreground">{expense.payer_name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(expense.created_at).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/30">
          <tr>
            <td className="px-4 py-3 font-semibold" colSpan={1}>
              합계
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("ko-KR")}원
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
