"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventCreateSchema } from "@/lib/validations/event";
import type { ActionResult } from "@/types/actions";

export async function createEventAction(
  formData: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const hostId = claimsData.claims.sub;

  const parsed = eventCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { title, category, event_date, location, max_participants, description } = parsed.data;

  const { data, error } = await supabase
    .from("events")
    .insert({
      host_id: hostId,
      title,
      category,
      event_date,
      location: location || null,
      max_participants: max_participants ?? null,
      description: description || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "이벤트 생성에 실패했습니다." };
  }

  revalidatePath("/protected/events");
  redirect(`/protected/events/${data.id}`);
}
