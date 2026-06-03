import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { AnnouncementCreateForm } from "@/components/announcements/AnnouncementCreateForm";
import { CommentList } from "@/components/announcements/CommentList";
import { CommentForm } from "@/components/announcements/CommentForm";
import type { Announcement } from "@/types/announcement";
import type { AnnouncementComment } from "@/types/comment";

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

  // 공지별 댓글 조회 (limit 20)
  const announcementIds = typedAnnouncements.map((a) => a.id);
  let commentsByAnnouncement: Record<string, AnnouncementComment[]> = {};

  if (announcementIds.length > 0) {
    const { data: commentsRaw } = await supabase
      .from("announcement_comments")
      .select("*")
      .in("announcement_id", announcementIds)
      .order("created_at", { ascending: true })
      .limit(20);

    const comments = (commentsRaw ?? []) as AnnouncementComment[];
    commentsByAnnouncement = comments.reduce<Record<string, AnnouncementComment[]>>((acc, c) => {
      if (!acc[c.announcement_id]) acc[c.announcement_id] = [];
      acc[c.announcement_id].push(c);
      return acc;
    }, {});
  }

  // 수락된 참여자 여부 확인 (댓글 폼 표시 조건)
  const { data: myParticipant } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .single();

  const canComment = isHost || !!myParticipant;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">공지사항</h2>

      {isHost && <AnnouncementCreateForm eventId={id} />}

      {typedAnnouncements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {typedAnnouncements.map((announcement) => (
            <div key={announcement.id} className="flex flex-col gap-3">
              <AnnouncementCard announcement={announcement} isHost={isHost} />

              {/* 댓글 섹션 */}
              <div className="ml-4 flex flex-col gap-3 border-l pl-4">
                <CommentList
                  comments={commentsByAnnouncement[announcement.id] ?? []}
                  eventId={id}
                  currentUserId={userId}
                  isHost={isHost}
                />
                {canComment && <CommentForm announcementId={announcement.id} eventId={id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
