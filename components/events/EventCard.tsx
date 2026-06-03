import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import type { Event } from "@/types/event";

interface EventCardProps {
  event: Event & { participantCount: number };
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.event_date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/protected/events/${event.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <EventStatusBadge status={event.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>{eventDate}</p>
          {event.location && <p>{event.location}</p>}
          <p className="mt-1 text-foreground">
            참여자 {event.participantCount}명
            {event.max_participants ? ` / 최대 ${event.max_participants}명` : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
