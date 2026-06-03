export type EventCategory = "swimming" | "fitness" | "gathering" | "other";

export type EventStatus = "active" | "cancelled" | "completed";

export type Event = {
  id: string;
  host_id: string;
  title: string;
  category: EventCategory;
  event_date: string;
  location: string | null;
  max_participants: number | null;
  description: string | null;
  join_code: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};
