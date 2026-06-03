// 댓글 목록 서버 컴포넌트
import { CommentItem } from "@/components/announcements/CommentItem";
import type { AnnouncementComment } from "@/types/comment";

interface CommentListProps {
  comments: AnnouncementComment[];
  eventId: string;
  currentUserId: string;
  isHost: boolean;
}

export function CommentList({ comments, eventId, currentUserId, isHost }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-xs text-muted-foreground">첫 댓글을 작성해 보세요.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          eventId={eventId}
          currentUserId={currentUserId}
          isHost={isHost}
        />
      ))}
    </div>
  );
}
