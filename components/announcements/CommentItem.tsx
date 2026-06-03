// 댓글 아이템 컴포넌트
import { deleteComment } from "@/app/protected/events/[id]/announcements/actions";
import type { AnnouncementComment } from "@/types/comment";

interface CommentItemProps {
  comment: AnnouncementComment;
  eventId: string;
  currentUserId: string;
  isHost: boolean;
}

export function CommentItem({ comment, eventId, currentUserId, isHost }: CommentItemProps) {
  const canDelete = isHost || comment.user_id === currentUserId;
  const createdAt = new Date(comment.created_at).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{comment.guest_name}</span>
        <p className="text-muted-foreground">{comment.content}</p>
        <span className="text-xs text-muted-foreground/60">{createdAt}</span>
      </div>
      {canDelete && (
        <form
          action={async () => {
            "use server";
            await deleteComment(comment.id, eventId);
          }}
        >
          <button
            type="submit"
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-red-500"
          >
            삭제
          </button>
        </form>
      )}
    </div>
  );
}
