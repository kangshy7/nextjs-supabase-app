import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventTabNav } from "@/components/events/EventTabNav";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <EventTabNav eventId={id} />
      {children}
    </div>
  );
}
