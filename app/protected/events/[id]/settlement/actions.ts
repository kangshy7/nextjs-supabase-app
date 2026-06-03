"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseCreateSchema } from "@/lib/validations/settlement";
import type { ActionResult } from "@/types/actions";

// 이벤트 주최자 여부 검증
async function verifyHost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from("events").select("host_id").eq("id", eventId).single();

  return data?.host_id === userId;
}

// 수락된 참여자 목록 조회 (participant_id 반환)
async function getAcceptedParticipantIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "accepted");

  return (data ?? []).map((p) => p.id);
}

// 비용 등록 및 참여자 균등 분할
export async function createExpense(
  eventId: string,
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 주최자 권한 검증
  if (!(await verifyHost(supabase, eventId, userId))) {
    return { success: false, error: "주최자만 비용을 등록할 수 있습니다." };
  }

  const parsed = expenseCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { description, amount, paid_by } = parsed.data;

  // 수락된 참여자 목록 조회
  const participantIds = await getAcceptedParticipantIds(supabase, eventId);
  if (participantIds.length === 0) {
    return { success: false, error: "수락된 참여자가 없어 정산을 생성할 수 없습니다." };
  }

  // 비용 INSERT
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({ event_id: eventId, description, amount, paid_by })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return { success: false, error: "비용 등록에 실패했습니다." };
  }

  // 균등 분할 금액 계산 (소수점 2자리 내림)
  const splitAmount = Math.floor((amount / participantIds.length) * 100) / 100;

  const splits = participantIds.map((participantId) => ({
    expense_id: expense.id,
    participant_id: participantId,
    amount: splitAmount,
    is_paid: false,
    paid_at: null,
  }));

  const { error: splitsError } = await supabase.from("expense_splits").insert(splits);

  if (splitsError) {
    // 비용 롤백
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { success: false, error: "정산 분할 생성에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/settlement`);
  return { success: true };
}

// 납부 완료/미납 토글 (주최자만)
export async function togglePayment(splitId: string, eventId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 주최자 권한 검증
  if (!(await verifyHost(supabase, eventId, userId))) {
    return { success: false, error: "주최자만 납부 상태를 변경할 수 있습니다." };
  }

  // 현재 납부 상태 조회
  const { data: split } = await supabase
    .from("expense_splits")
    .select("is_paid")
    .eq("id", splitId)
    .single();

  if (!split) {
    return { success: false, error: "정산 항목을 찾을 수 없습니다." };
  }

  const newIsPaid = !split.is_paid;

  const { error } = await supabase
    .from("expense_splits")
    .update({
      is_paid: newIsPaid,
      paid_at: newIsPaid ? new Date().toISOString() : null,
    })
    .eq("id", splitId);

  if (error) {
    return { success: false, error: "납부 상태 변경에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/settlement`);
  return { success: true };
}
