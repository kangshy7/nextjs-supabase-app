// 공지 댓글 관련 타입 정의

export type AnnouncementComment = {
  id: string;
  announcement_id: string;
  event_id: string;
  user_id: string | null;
  guest_name: string;
  content: string;
  created_at: string;
};
