"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/actions";

async function getHostId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  participantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("id", participantId)
    .single();

  if (!data) return null;

  const { data: event } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", data.event_id)
    .single();

  return event?.host_id ?? null;
}

export async function acceptParticipant(participantId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;
  const hostId = await getHostId(supabase, participantId);

  if (hostId !== userId) {
    return { success: false, error: "권한이 없습니다." };
  }

  // 참여자가 속한 이벤트 정보 조회
  const { data: participant } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("id", participantId)
    .single();

  if (!participant) {
    return { success: false, error: "참여자를 찾을 수 없습니다." };
  }

  // max_participants 재검증
  const { data: event } = await supabase
    .from("events")
    .select("max_participants")
    .eq("id", participant.event_id)
    .single();

  if (event?.max_participants) {
    const { count } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", participant.event_id)
      .eq("status", "accepted");

    if ((count ?? 0) >= event.max_participants) {
      return { success: false, error: "최대 참여 인원에 도달했습니다." };
    }
  }

  const { error } = await supabase
    .from("event_participants")
    .update({ status: "accepted" })
    .eq("id", participantId);

  if (error) {
    return { success: false, error: "수락 처리에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${participant.event_id}/participants`);
  return { success: true };
}

export async function rejectParticipant(participantId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;
  const hostId = await getHostId(supabase, participantId);

  if (hostId !== userId) {
    return { success: false, error: "권한이 없습니다." };
  }

  const { data: participant } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("id", participantId)
    .single();

  const { error } = await supabase
    .from("event_participants")
    .update({ status: "rejected" })
    .eq("id", participantId);

  if (error) {
    return { success: false, error: "거절 처리에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${participant?.event_id}/participants`);
  return { success: true };
}

// 본인 참여 취소 (참여자 본인만)
export async function cancelParticipation(participantId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 본인 참여 여부 확인
  const { data: participant } = await supabase
    .from("event_participants")
    .select("event_id, user_id, status")
    .eq("id", participantId)
    .single();

  if (!participant) {
    return { success: false, error: "참여 내역을 찾을 수 없습니다." };
  }

  if (participant.user_id !== userId) {
    return { success: false, error: "본인의 참여만 취소할 수 있습니다." };
  }

  if (participant.status === "cancelled") {
    return { success: false, error: "이미 취소된 참여입니다." };
  }

  const { error } = await supabase
    .from("event_participants")
    .update({ status: "cancelled" })
    .eq("id", participantId);

  if (error) {
    return { success: false, error: "참여 취소에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${participant.event_id}/participants`);
  return { success: true };
}
