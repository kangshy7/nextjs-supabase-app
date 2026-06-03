import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import type { Event } from "@/types/event";

export default async function EventsPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data: events } = await supabase
    .from("events")
    .select("*, event_participants(count)")
    .eq("host_id", userId)
    .order("created_at", { ascending: false });

  const eventsWithCount = (events ?? []).map((e) => ({
    ...(e as unknown as Event),
    participantCount: (e.event_participants as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">내 이벤트</h1>
        <Button asChild>
          <Link href="/protected/events/new">이벤트 만들기</Link>
        </Button>
      </div>

      {eventsWithCount.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">아직 만든 이벤트가 없습니다.</p>
          <Button asChild>
            <Link href="/protected/events/new">첫 이벤트 만들기</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {eventsWithCount.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
