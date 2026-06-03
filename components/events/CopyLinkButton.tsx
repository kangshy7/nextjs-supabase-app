"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CopyLinkButtonProps {
  eventId: string;
  joinCode: string;
}

export function CopyLinkButton({ eventId, joinCode }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/events/${eventId}/join?code=${joinCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? "복사됨!" : "참여 링크 복사"}
    </Button>
  );
}
