export type ParticipantStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type EventParticipant = {
  id: string;
  event_id: string;
  user_id: string | null;
  guest_name: string;
  guest_email: string | null;
  note: string | null;
  status: ParticipantStatus;
  created_at: string;
  updated_at: string;
};
