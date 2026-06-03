"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { togglePin, deleteAnnouncement } from "@/app/protected/events/[id]/announcements/actions";

interface AnnouncementActionsProps {
  announcementId: string;
  eventId: string;
  isPinned: boolean;
}

export function AnnouncementActions({
  announcementId,
  eventId,
  isPinned,
}: AnnouncementActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleTogglePin = () => {
    startTransition(async () => {
      await togglePin(announcementId, eventId);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteAnnouncement(announcementId, eventId);
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" onClick={handleTogglePin} disabled={isPending}>
        {isPinned ? "📌 고정 해제" : "📌 고정"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            disabled={isPending}
          >
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>삭제된 공지는 복구할 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
