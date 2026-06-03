"use server";

import { createClient } from "@/lib/supabase/server";
import { joinFormSchema } from "@/lib/validations/participant";
import type { ActionResult } from "@/types/actions";

export async function joinEventAction(
  eventId: string,
  joinCode: string,
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  // join_code 서버 사이드 재검증
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, join_code, max_participants, status")
    .eq("id", eventId)
    .eq("join_code", joinCode)
    .single();

  if (eventError || !event) {
    return { success: false, error: "유효하지 않은 참여 링크입니다." };
  }

  if (event.status !== "active") {
    return { success: false, error: "현재 참여 신청이 불가능한 이벤트입니다." };
  }

  // max_participants 도달 여부 확인
  if (event.max_participants) {
    const { count } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "accepted");

    if ((count ?? 0) >= event.max_participants) {
      return { success: false, error: "모집 인원이 마감되었습니다." };
    }
  }

  const parsed = joinFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { guest_name, guest_email, note } = parsed.data;

  // 중복 신청 확인
  if (userId) {
    const { data: existing } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .not("status", "eq", "rejected")
      .maybeSingle();

    if (existing) {
      return { success: false, error: "이미 참여 신청하셨습니다." };
    }
  } else if (guest_email) {
    const { data: existing } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("guest_email", guest_email)
      .not("status", "eq", "rejected")
      .maybeSingle();

    if (existing) {
      return { success: false, error: "해당 이메일로 이미 신청하셨습니다." };
    }
  }

  const { error: insertError } = await supabase.from("event_participants").insert({
    event_id: eventId,
    user_id: userId,
    guest_name,
    guest_email: guest_email || null,
    note: note || null,
    status: "pending",
  });

  if (insertError) {
    return { success: false, error: "참여 신청에 실패했습니다. 다시 시도해 주세요." };
  }

  return { success: true };
}
