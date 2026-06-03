// 카풀 관련 타입 정의

export type CarpoolMemberStatus = "pending" | "accepted" | "rejected";

export type CarpoolGroup = {
  id: string;
  event_id: string;
  driver_id: string; // event_participants.id
  departure: string;
  capacity: number;
  memo: string | null;
  created_at: string;
};

export type CarpoolMember = {
  id: string;
  group_id: string;
  participant_id: string; // event_participants.id
  status: CarpoolMemberStatus;
  created_at: string;
};

export type CarpoolGroupWithMembers = CarpoolGroup & {
  driver_name: string;
  accepted_count: number;
  members: (CarpoolMember & { guest_name: string })[];
};
