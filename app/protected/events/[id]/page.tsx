import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { CopyLinkButton } from "@/components/events/CopyLinkButton";
import { DuplicateEventButton } from "@/components/events/DuplicateEventButton";
import { Button } from "@/components/ui/button";
import type { Event } from "@/types/event";
import type { Announcement } from "@/types/announcement";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const [eventResult, announcementsResult, participantsResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", id)
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("event_participants").select("status").eq("event_id", id),
  ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data as Event;
  const pinnedAnnouncements = (announcementsResult.data ?? []) as Announcement[];
  const participants = participantsResult.data ?? [];

  const isHost = event.host_id === userId;
  const acceptedCount = participants.filter((p) => p.status === "accepted").length;
  const pendingCount = participants.filter((p) => p.status === "pending").length;

  const eventDate = new Date(event.event_date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-sm text-muted-foreground">{eventDate}</p>
          {event.location && <p className="text-sm text-muted-foreground">{event.location}</p>}
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton eventId={event.id} joinCode={event.join_code} />
          {isHost && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/protected/events/${event.id}/edit`}>수정</Link>
              </Button>
              <DuplicateEventButton eventId={event.id} />
            </>
          )}
        </div>
      </div>

      {event.description && <p className="rounded-lg bg-muted p-4 text-sm">{event.description}</p>}

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">참여자 현황</h2>
        <div className="flex gap-4 text-sm">
          <span>
            수락 <strong>{acceptedCount}</strong>명
          </span>
          <span>
            대기 <strong>{pendingCount}</strong>명
          </span>
          {event.max_participants && (
            <span className="text-muted-foreground">/ 최대 {event.max_participants}명</span>
          )}
        </div>
      </div>

      {pinnedAnnouncements.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">📌 고정 공지</h2>
          {pinnedAnnouncements.map((a) => (
            <div key={a.id} className="rounded-lg border p-4">
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
