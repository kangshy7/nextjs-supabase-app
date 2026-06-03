// 정산 페이지 - 비용 목록, 분할 현황, 주최자용 비용 등록 폼
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpenseTable } from "@/components/settlement/ExpenseTable";
import { SplitSummaryTable } from "@/components/settlement/SplitSummaryTable";
import { ExpenseCreateForm } from "@/components/settlement/ExpenseCreateForm";
import { ExpenseSplitList } from "@/components/settlement/ExpenseSplitList";
import { UnpaidSummary } from "@/components/settlement/UnpaidSummary";
import type { ExpenseWithPayer, SettlementSummaryItem } from "@/types/settlement";

interface SettlementPageProps {
  params: Promise<{ id: string }>;
}

export default async function SettlementPage({ params }: SettlementPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  // 이벤트 정보 조회
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, host_id, title")
    .eq("id", id)
    .single();

  if (eventError || !event) notFound();

  const isHost = event.host_id === userId;

  // 수락된 참여자 목록 조회 (납부자 선택용)
  const { data: participants } = await supabase
    .from("event_participants")
    .select("id, guest_name")
    .eq("event_id", id)
    .eq("status", "accepted")
    .order("created_at", { ascending: true });

  const acceptedParticipants = participants ?? [];

  // 비용 목록 조회 (납부자 이름 포함)
  const { data: expensesRaw } = await supabase
    .from("expenses")
    .select("*, payer:event_participants!paid_by(guest_name)")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  // 납부자 이름을 포함한 비용 데이터 정제
  const expenses: ExpenseWithPayer[] = (expensesRaw ?? []).map((e) => ({
    id: e.id,
    event_id: e.event_id,
    description: e.description,
    amount: e.amount,
    paid_by: e.paid_by,
    created_at: e.created_at,
    payer_name: Array.isArray(e.payer)
      ? (e.payer[0]?.guest_name ?? "알 수 없음")
      : (e.payer?.guest_name ?? "알 수 없음"),
  }));

  // 개인별 정산 요약 RPC 호출
  const { data: summaryRaw } = await supabase.rpc("get_settlement_summary", {
    event_id: id,
  });

  const summaryItems = (summaryRaw ?? []) as SettlementSummaryItem[];

  // 비용별 분할 현황 조회 (납부 상태 포함)
  const { data: splitsRaw } = await supabase
    .from("expense_splits")
    .select(
      "*, participant:event_participants!participant_id(guest_name), expense:expenses!expense_id(description, event_id)"
    )
    .eq("expenses.event_id", id)
    .order("created_at", { ascending: true });

  // 해당 이벤트의 splits만 필터
  type SplitRaw = {
    id: string;
    expense_id: string;
    participant_id: string;
    amount: number;
    is_paid: boolean;
    paid_at: string | null;
    created_at: string;
    participant: { guest_name: string } | { guest_name: string }[] | null;
    expense:
      | { description: string; event_id: string }
      | { description: string; event_id: string }[]
      | null;
  };

  const validSplits = ((splitsRaw ?? []) as SplitRaw[]).filter((s) => {
    const expense = Array.isArray(s.expense) ? s.expense[0] : s.expense;
    return expense?.event_id === id;
  });

  const splits = validSplits.map((s) => {
    const participantData = Array.isArray(s.participant) ? s.participant[0] : s.participant;
    return {
      id: s.id,
      expense_id: s.expense_id,
      participant_id: s.participant_id,
      amount: s.amount,
      is_paid: s.is_paid,
      paid_at: s.paid_at,
      created_at: s.created_at,
      guest_name: participantData?.guest_name ?? "알 수 없음",
    };
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">정산</h2>
        {totalAmount > 0 && (
          <span className="text-sm text-muted-foreground">
            총 비용:{" "}
            <span className="font-semibold text-foreground">
              {totalAmount.toLocaleString("ko-KR")}원
            </span>
          </span>
        )}
      </div>

      {/* 주최자 전용: 비용 등록 폼 */}
      {isHost && (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">비용 등록</h3>
          {acceptedParticipants.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              수락된 참여자가 없어 비용을 등록할 수 없습니다.
            </p>
          ) : (
            <ExpenseCreateForm eventId={id} participants={acceptedParticipants} />
          )}
        </section>
      )}

      {/* 비용 목록 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">비용 내역</h3>
        <ExpenseTable expenses={expenses} />
      </section>

      {/* 개인별 납부 현황 */}
      {splits.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">납부 현황</h3>
          <ExpenseSplitList splits={splits} eventId={id} isHost={isHost} />
        </section>
      )}

      {/* 개인별 요약 */}
      {summaryItems.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">개인별 정산 요약</h3>
          <SplitSummaryTable summaryItems={summaryItems} />
        </section>
      )}

      {/* 미납 리마인더 (주최자 전용) */}
      {isHost && summaryItems.length > 0 && (
        <UnpaidSummary summaryItems={summaryItems} eventId={id} />
      )}
    </div>
  );
}
