import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/types/event";

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  active: { label: "진행중", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  cancelled: { label: "취소됨", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  completed: { label: "완료됨", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

interface EventStatusBadgeProps {
  status: EventStatus;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge className={config.className} variant="secondary">
      {config.label}
    </Badge>
  );
}
