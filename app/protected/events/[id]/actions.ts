"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/actions";

// 이벤트 복사 - 기존 이벤트를 기반으로 새 이벤트 생성
export async function duplicateEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 원본 이벤트 조회
  const { data: original, error: fetchError } = await supabase
    .from("events")
    .select("host_id, title, category, event_date, location, max_participants, description")
    .eq("id", eventId)
    .single();

  if (fetchError || !original) {
    return { success: false, error: "이벤트를 찾을 수 없습니다." };
  }

  // 주최자 권한 검증
  if (original.host_id !== userId) {
    return { success: false, error: "주최자만 이벤트를 복사할 수 있습니다." };
  }

  // event_date + 7일 계산
  const newEventDate = original.event_date
    ? new Date(new Date(original.event_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: newEvent, error: insertError } = await supabase
    .from("events")
    .insert({
      host_id: userId,
      title: `${original.title}(복사)`,
      category: original.category,
      event_date: newEventDate,
      location: original.location,
      max_participants: original.max_participants,
      description: original.description,
    })
    .select("id")
    .single();

  if (insertError || !newEvent) {
    return { success: false, error: "이벤트 복사에 실패했습니다." };
  }

  revalidatePath("/protected/events");
  redirect(`/protected/events/${newEvent.id}`);
}
