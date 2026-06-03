// 이벤트 수정 페이지 (주최자 전용)
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventEditForm } from "@/components/events/EventEditForm";
import type { EventCategory } from "@/types/event";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventEditPage({ params }: EditPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, host_id, title, category, event_date, location, max_participants, description")
    .eq("id", id)
    .single();

  if (eventError || !event) notFound();

  // 주최자만 수정 가능
  if (event.host_id !== userId) {
    redirect(`/protected/events/${id}`);
  }

  // datetime-local input 형식으로 변환 (YYYY-MM-DDTHH:MM)
  const eventDateLocal = event.event_date
    ? new Date(event.event_date).toISOString().slice(0, 16)
    : "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">이벤트 수정</h1>
      <EventEditForm
        eventId={id}
        defaultValues={{
          title: event.title,
          category: event.category as EventCategory,
          event_date: eventDateLocal,
          location: event.location,
          max_participants: event.max_participants,
          description: event.description,
        }}
      />
    </div>
  );
}
