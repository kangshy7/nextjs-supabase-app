import { AnnouncementActions } from "@/components/announcements/AnnouncementActions";
import type { Announcement } from "@/types/announcement";

interface AnnouncementCardProps {
  announcement: Announcement;
  isHost: boolean;
}

export function AnnouncementCard({ announcement, isHost }: AnnouncementCardProps) {
  const createdDate = new Date(announcement.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {announcement.is_pinned && <span className="text-sm">📌</span>}
            <h3 className="font-semibold">{announcement.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{createdDate}</p>
        </div>

        {isHost && (
          <AnnouncementActions
            announcementId={announcement.id}
            eventId={announcement.event_id}
            isPinned={announcement.is_pinned}
          />
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
        {announcement.content}
      </p>
    </div>
  );
}
