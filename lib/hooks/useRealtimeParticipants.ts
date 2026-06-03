"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// 실시간 참여 신청 알림 훅 (주최자 전용)
export function useRealtimeParticipants(eventId: string) {
  useEffect(() => {
    const supabase = createClient();

    // 이벤트별 채널 격리
    const channel = supabase
      .channel(`participants-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newRow = payload.new as { status?: string; guest_name?: string };
          if (newRow.status === "pending") {
            toast.info(`새 참여 신청이 있습니다.`, {
              description: newRow.guest_name ? `신청자: ${newRow.guest_name}` : undefined,
            });
          }
        }
      )
      .subscribe();

    // 컴포넌트 언마운트 시 구독 해제 (메모리 누수 방지)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);
}
