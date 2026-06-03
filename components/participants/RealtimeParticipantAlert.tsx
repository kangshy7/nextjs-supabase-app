"use client";

// 실시간 참여 신청 알림 컴포넌트 (주최자 전용, 클라이언트 컴포넌트)
import { useRealtimeParticipants } from "@/lib/hooks/useRealtimeParticipants";

interface RealtimeParticipantAlertProps {
  eventId: string;
}

export function RealtimeParticipantAlert({ eventId }: RealtimeParticipantAlertProps) {
  useRealtimeParticipants(eventId);

  // UI 없이 훅만 마운트 (토스트로 알림)
  return null;
}
