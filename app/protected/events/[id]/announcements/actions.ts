"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { announcementCreateSchema } from "@/lib/validations/announcement";
import { commentCreateSchema } from "@/lib/validations/comment";
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

// 댓글 작성 (수락된 참여자 또는 주최자)
export async function createComment(
  announcementId: string,
  eventId: string,
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  const [participantResult, eventResult] = await Promise.all([
    supabase
      .from("event_participants")
      .select("guest_name")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "accepted")
      .single(),
    supabase.from("events").select("host_id").eq("id", eventId).single(),
  ]);

  const isHost = eventResult.data?.host_id === userId;
  const isAccepted = !!participantResult.data;

  if (!isHost && !isAccepted) {
    return { success: false, error: "수락된 참여자만 댓글을 작성할 수 있습니다." };
  }

  const parsed = commentCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const guestName = participantResult.data?.guest_name ?? "주최자";

  const { error } = await supabase.from("announcement_comments").insert({
    announcement_id: announcementId,
    event_id: eventId,
    user_id: userId,
    guest_name: guestName,
    content: parsed.data.content,
  });

  if (error) {
    return { success: false, error: "댓글 작성에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/announcements`);
  return { success: true };
}

// 댓글 삭제 (작성자 본인 또는 주최자)
export async function deleteComment(commentId: string, eventId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  const { data: comment } = await supabase
    .from("announcement_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { success: false, error: "댓글을 찾을 수 없습니다." };
  }

  const { data: event } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  const isHost = event?.host_id === userId;
  const isAuthor = comment.user_id === userId;

  if (!isHost && !isAuthor) {
    return { success: false, error: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("announcement_comments").delete().eq("id", commentId);

  if (error) {
    return { success: false, error: "댓글 삭제에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/announcements`);
  return { success: true };
}
