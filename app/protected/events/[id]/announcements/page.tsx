import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { AnnouncementCreateForm } from "@/components/announcements/AnnouncementCreateForm";
import type { Announcement } from "@/types/announcement";

interface AnnouncementsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnnouncementsPage({ params }: AnnouncementsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", id)
    .single();

  if (eventError || !event) notFound();

  const isHost = event.host_id === userId;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const typedAnnouncements = (announcements ?? []) as Announcement[];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">공지사항</h2>

      {isHost && <AnnouncementCreateForm eventId={id} />}

      {typedAnnouncements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {typedAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} isHost={isHost} />
          ))}
        </div>
      )}
    </div>
  );
}
