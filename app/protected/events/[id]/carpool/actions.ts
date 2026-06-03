"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carpoolGroupCreateSchema } from "@/lib/validations/carpool";
import type { ActionResult } from "@/types/actions";

// 현재 유저가 해당 이벤트의 수락된 참여자인지 검증 (participant id 반환)
async function getAcceptedParticipantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .single();

  return data?.id ?? null;
}

// 이벤트 주최자 여부 검증
async function isHost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from("events").select("host_id").eq("id", eventId).single();

  return data?.host_id === userId;
}

// 카풀 그룹 생성 (수락된 참여자만)
export async function createCarpoolGroup(
  eventId: string,
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 수락된 참여자 여부 확인
  const participantId = await getAcceptedParticipantId(supabase, eventId, userId);
  if (!participantId) {
    return { success: false, error: "수락된 참여자만 카풀 그룹을 생성할 수 있습니다." };
  }

  const parsed = carpoolGroupCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { departure, capacity, memo } = parsed.data;

  const { error } = await supabase.from("carpool_groups").insert({
    event_id: eventId,
    driver_id: participantId,
    departure,
    capacity,
    memo: memo || null,
  });

  if (error) {
    return { success: false, error: "카풀 그룹 생성에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/carpool`);
  return { success: true };
}

// 카풀 그룹 동승 신청
export async function joinCarpoolGroup(groupId: string, eventId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 수락된 참여자 여부 확인
  const participantId = await getAcceptedParticipantId(supabase, eventId, userId);
  if (!participantId) {
    return { success: false, error: "수락된 참여자만 동승 신청할 수 있습니다." };
  }

  // 그룹 정원 및 현재 수락 인원 확인
  const { data: group } = await supabase
    .from("carpool_groups")
    .select("capacity, driver_id")
    .eq("id", groupId)
    .single();

  if (!group) {
    return { success: false, error: "카풀 그룹을 찾을 수 없습니다." };
  }

  // 드라이버 본인은 신청 불가
  if (group.driver_id === participantId) {
    return { success: false, error: "본인이 개설한 카풀 그룹에는 신청할 수 없습니다." };
  }

  // 이미 신청한 경우 확인
  const { data: existingMember } = await supabase
    .from("carpool_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("participant_id", participantId)
    .single();

  if (existingMember) {
    return { success: false, error: "이미 신청한 카풀 그룹입니다." };
  }

  // 수락된 인원이 정원을 초과하는지 확인 (서버 사이드 방지)
  const { count: acceptedCount } = await supabase
    .from("carpool_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "accepted");

  if ((acceptedCount ?? 0) >= group.capacity) {
    return { success: false, error: "정원이 가득 찼습니다." };
  }

  const { error } = await supabase.from("carpool_members").insert({
    group_id: groupId,
    participant_id: participantId,
    status: "pending",
  });

  if (error) {
    return { success: false, error: "카풀 신청에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/carpool`);
  return { success: true };
}

// 카풀 멤버 수락 (드라이버만)
export async function acceptCarpoolMember(
  memberId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 드라이버 권한 검증
  const { data: member } = await supabase
    .from("carpool_members")
    .select("group_id, carpool_groups(driver_id, capacity)")
    .eq("id", memberId)
    .single();

  if (!member) {
    return { success: false, error: "신청 내역을 찾을 수 없습니다." };
  }

  // carpool_groups 관계 데이터 추출
  const groupData = Array.isArray(member.carpool_groups)
    ? member.carpool_groups[0]
    : member.carpool_groups;

  if (!groupData) {
    return { success: false, error: "카풀 그룹을 찾을 수 없습니다." };
  }

  // 드라이버의 participant_id로 user_id 조회
  const { data: driverParticipant } = await supabase
    .from("event_participants")
    .select("user_id")
    .eq("id", groupData.driver_id)
    .single();

  if (driverParticipant?.user_id !== userId) {
    return { success: false, error: "드라이버만 수락/거절할 수 있습니다." };
  }

  // 정원 초과 방지
  const { count: acceptedCount } = await supabase
    .from("carpool_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", member.group_id)
    .eq("status", "accepted");

  if ((acceptedCount ?? 0) >= groupData.capacity) {
    return { success: false, error: "정원이 가득 찼습니다." };
  }

  const { error } = await supabase
    .from("carpool_members")
    .update({ status: "accepted" })
    .eq("id", memberId);

  if (error) {
    return { success: false, error: "수락 처리에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/carpool`);
  return { success: true };
}

// 카풀 멤버 거절 (드라이버만)
export async function rejectCarpoolMember(
  memberId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  // 드라이버 권한 검증
  const { data: member } = await supabase
    .from("carpool_members")
    .select("group_id, carpool_groups(driver_id)")
    .eq("id", memberId)
    .single();

  if (!member) {
    return { success: false, error: "신청 내역을 찾을 수 없습니다." };
  }

  const groupData = Array.isArray(member.carpool_groups)
    ? member.carpool_groups[0]
    : member.carpool_groups;

  if (!groupData) {
    return { success: false, error: "카풀 그룹을 찾을 수 없습니다." };
  }

  const { data: driverParticipant } = await supabase
    .from("event_participants")
    .select("user_id")
    .eq("id", groupData.driver_id)
    .single();

  if (driverParticipant?.user_id !== userId) {
    return { success: false, error: "드라이버만 수락/거절할 수 있습니다." };
  }

  const { error } = await supabase
    .from("carpool_members")
    .update({ status: "rejected" })
    .eq("id", memberId);

  if (error) {
    return { success: false, error: "거절 처리에 실패했습니다." };
  }

  revalidatePath(`/protected/events/${eventId}/carpool`);
  return { success: true };
}

// 주최자도 카풀 관리 가능하도록 isHost 함수 export
export { isHost };
