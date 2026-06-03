import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "@/components/participants/JoinForm";
import type { Event } from "@/types/event";

interface JoinPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}

async function JoinContent({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
  searchParamsPromise: Promise<{ code?: string }>;
}) {
  const { id } = await paramsPromise;
  const { code } = await searchParamsPromise;

  const supabase = await createClient();

  if (!code) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-20 text-center">
        <p className="text-lg font-medium text-red-600">유효하지 않은 참여 링크입니다.</p>
        <p className="text-sm text-muted-foreground">올바른 링크로 다시 접근해 주세요.</p>
      </div>
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("join_code", code)
    .single();

  if (eventError || !event) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-20 text-center">
        <p className="text-lg font-medium text-red-600">유효하지 않은 참여 링크입니다.</p>
        <p className="text-sm text-muted-foreground">링크가 만료되었거나 존재하지 않습니다.</p>
      </div>
    );
  }

  const typedEvent = event as Event;

  let isFull = false;
  if (typedEvent.max_participants) {
    const { count } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "accepted");

    isFull = (count ?? 0) >= typedEvent.max_participants;
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  let defaultName: string | undefined;
  let defaultEmail: string | undefined;

  if (claimsData?.claims?.sub) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", claimsData.claims.sub)
      .single();

    defaultName = profile?.full_name ?? undefined;
    defaultEmail = claimsData.claims.email as string | undefined;
  }

  const eventDate = new Date(typedEvent.event_date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{typedEvent.title}</h1>
        <p className="text-sm text-muted-foreground">{eventDate}</p>
        {typedEvent.location && (
          <p className="text-sm text-muted-foreground">{typedEvent.location}</p>
        )}
        {typedEvent.max_participants && (
          <p className="text-sm text-muted-foreground">최대 {typedEvent.max_participants}명 모집</p>
        )}
      </div>

      {isFull ? (
        <div className="rounded-lg bg-muted p-6 text-center">
          <p className="font-medium">모집이 마감되었습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">더 이상 참여 신청을 받지 않습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">참여 신청</h2>
          <JoinForm
            eventId={id}
            joinCode={code}
            defaultName={defaultName}
            defaultEmail={defaultEmail}
          />
        </div>
      )}
    </div>
  );
}

export default function JoinPage({ params, searchParams }: JoinPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-md items-center justify-center pt-20">
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      }
    >
      <JoinContent paramsPromise={params} searchParamsPromise={searchParams} />
    </Suspense>
  );
}
