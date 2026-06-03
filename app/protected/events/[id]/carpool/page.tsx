// 카풀 페이지 - 카풀 그룹 목록 및 신청 관리
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CarpoolGroupCard } from "@/components/carpool/CarpoolGroupCard";
import { CarpoolGroupCreateForm } from "@/components/carpool/CarpoolGroupCreateForm";
import type { CarpoolMemberStatus } from "@/types/carpool";

interface CarpoolPageProps {
  params: Promise<{ id: string }>;
}

export default async function CarpoolPage({ params }: CarpoolPageProps) {
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
    .select("id, host_id")
    .eq("id", id)
    .single();

  if (eventError || !event) notFound();

  // 현재 유저의 수락된 참여자 ID 조회
  const { data: myParticipant } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .single();

  const currentParticipantId = myParticipant?.id ?? null;

  // 주최자도 참여자가 아닌 경우 그룹 개설/신청 불가 (단, 목록 조회는 가능)
  const canCreateGroup = !!currentParticipantId;

  // 카풀 그룹 목록 조회
  const { data: groupsRaw } = await supabase
    .from("carpool_groups")
    .select("*, driver:event_participants!driver_id(guest_name)")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  // 카풀 멤버 목록 조회 (전체 그룹에 대한 멤버)
  const groupIds = (groupsRaw ?? []).map((g) => g.id);
  let membersRaw: {
    id: string;
    group_id: string;
    participant_id: string;
    status: string;
    created_at: string;
    participant: { guest_name: string } | { guest_name: string }[] | null;
  }[] = [];

  if (groupIds.length > 0) {
    const { data } = await supabase
      .from("carpool_members")
      .select("*, participant:event_participants!participant_id(guest_name)")
      .in("group_id", groupIds)
      .order("created_at", { ascending: true });
    membersRaw = data ?? [];
  }

  // 그룹별 멤버 맵 생성
  const membersByGroup = membersRaw.reduce<
    Record<
      string,
      { id: string; participant_id: string; status: CarpoolMemberStatus; guest_name: string }[]
    >
  >((acc, m) => {
    const participantData = Array.isArray(m.participant) ? m.participant[0] : m.participant;
    const entry = {
      id: m.id,
      participant_id: m.participant_id,
      status: m.status as CarpoolMemberStatus,
      guest_name: participantData?.guest_name ?? "알 수 없음",
    };

    if (!acc[m.group_id]) acc[m.group_id] = [];
    acc[m.group_id].push(entry);
    return acc;
  }, {});

  // 그룹 데이터 정제
  const groups = (groupsRaw ?? []).map((g) => {
    const driverData = Array.isArray(g.driver) ? g.driver[0] : g.driver;
    return {
      id: g.id,
      driver_id: g.driver_id,
      driver_name: driverData?.guest_name ?? "알 수 없음",
      departure: g.departure,
      capacity: g.capacity,
      memo: g.memo,
      created_at: g.created_at,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">카풀</h2>
        <span className="text-sm text-muted-foreground">{groups.length}개 그룹</span>
      </div>

      {/* 그룹 개설 폼 (수락된 참여자만) */}
      {canCreateGroup && <CarpoolGroupCreateForm eventId={id} />}

      {!canCreateGroup && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          수락된 참여자만 카풀 그룹을 개설하거나 동승 신청할 수 있습니다.
        </p>
      )}

      {/* 카풀 그룹 목록 */}
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          등록된 카풀 그룹이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <CarpoolGroupCard
              key={group.id}
              group={group}
              members={membersByGroup[group.id] ?? []}
              eventId={id}
              currentParticipantId={currentParticipantId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
