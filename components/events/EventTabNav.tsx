"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  disabled?: boolean;
}

interface EventTabNavProps {
  eventId: string;
}

export function EventTabNav({ eventId }: EventTabNavProps) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: "홈", href: `/protected/events/${eventId}` },
    { label: "공지", href: `/protected/events/${eventId}/announcements` },
    { label: "참여자", href: `/protected/events/${eventId}/participants` },
    { label: "카풀", href: `/protected/events/${eventId}/carpool` },
    { label: "정산", href: `/protected/events/${eventId}/settlement` },
  ];

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return tab.disabled ? (
          <span
            key={tab.href}
            className="cursor-not-allowed select-none px-4 py-2 text-sm text-muted-foreground/50"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
