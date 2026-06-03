"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventUpdateSchema } from "@/lib/validations/event";
import type { ActionResult } from "@/types/actions";

export async function updateEventAction(
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
  const { data: event } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  if (!event || event.host_id !== userId) {
    return { success: false, error: "주최자만 이벤트를 수정할 수 있습니다." };
  }

  const parsed = eventUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { title, category, event_date, location, max_participants, description } = parsed.data;

  const { error } = await supabase
    .from("events")
    .update({
      title,
      category,
      event_date,
      location: location || null,
      max_participants: max_participants ?? null,
      description: description || null,
    })
    .eq("id", eventId);

  if (error) {
    return { success: false, error: "이벤트 수정에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}`);
  revalidatePath("/protected/events");
  redirect(`/protected/events/${eventId}`);
}
