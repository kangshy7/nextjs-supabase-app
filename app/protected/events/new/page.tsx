import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventCreateForm } from "@/components/events/EventCreateForm";

export default async function NewEventPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">새 이벤트</h1>
      <EventCreateForm />
    </div>
  );
}
