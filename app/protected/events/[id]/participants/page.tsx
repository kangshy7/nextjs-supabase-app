import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ParticipantRow } from "@/components/participants/ParticipantRow";
import { cn } from "@/lib/utils";
import type { EventParticipant, ParticipantStatus } from "@/types/participant";

interface ParticipantsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}

const filterTabs: { label: string; value: string }[] = [
  { label: "전체", value: "all" },
  { label: "대기", value: "pending" },
  { label: "수락", value: "accepted" },
  { label: "거절", value: "rejected" },
];

export default async function ParticipantsPage({ params, searchParams }: ParticipantsPageProps) {
  const { id } = await params;
  const { status: statusFilter } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, host_id, max_participants")
    .eq("id", id)
    .single();

  if (eventError || !event) notFound();

  const isHost = event.host_id === userId;

  // 수락 수는 필터와 무관하게 항상 전체에서 계산
  const [participantsResult, acceptedCountResult] = await Promise.all([
    (() => {
      let q = supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        q = q.eq("status", statusFilter as ParticipantStatus);
      }
      return q;
    })(),
    supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "accepted"),
  ]);

  const participants = (participantsResult.data ?? []) as EventParticipant[];
  const acceptedCount = acceptedCountResult.count ?? 0;
  const activeFilter = statusFilter ?? "all";

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">참여자 관리</h2>

      <div className="flex gap-1 border-b">
        {filterTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/protected/events/${id}/participants?status=${tab.value}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeFilter === tab.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {participants.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">참여자가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {participants.map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              isHost={isHost}
              currentAccepted={acceptedCount}
              maxParticipants={event.max_participants}
              currentUserId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
