"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { announcementCreateSchema } from "@/lib/validations/announcement";
import type { ActionResult } from "@/types/actions";

async function verifyHost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from("events").select("host_id").eq("id", eventId).single();

  return data?.host_id === userId;
}

export async function createAnnouncement(
  eventId: string,
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  if (!(await verifyHost(supabase, eventId, userId))) {
    return { success: false, error: "권한이 없습니다." };
  }

  const parsed = announcementCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("announcements").insert({
    event_id: eventId,
    host_id: userId,
    title: parsed.data.title,
    content: parsed.data.content,
    is_pinned: false,
  });

  if (error) {
    return { success: false, error: "공지 작성에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/announcements`);
  revalidatePath(`/protected/events/${eventId}`);
  return { success: true };
}

export async function togglePin(announcementId: string, eventId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  if (!(await verifyHost(supabase, eventId, userId))) {
    return { success: false, error: "권한이 없습니다." };
  }

  const { data: current } = await supabase
    .from("announcements")
    .select("is_pinned")
    .eq("id", announcementId)
    .single();

  const { error } = await supabase
    .from("announcements")
    .update({ is_pinned: !current?.is_pinned })
    .eq("id", announcementId);

  if (error) {
    return { success: false, error: "핀 처리에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/announcements`);
  revalidatePath(`/protected/events/${eventId}`);
  return { success: true };
}

export async function deleteAnnouncement(
  announcementId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  if (!(await verifyHost(supabase, eventId, userId))) {
    return { success: false, error: "권한이 없습니다." };
  }

  const { error } = await supabase.from("announcements").delete().eq("id", announcementId);

  if (error) {
    return { success: false, error: "공지 삭제에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/announcements`);
  revalidatePath(`/protected/events/${eventId}`);
  return { success: true };
}
