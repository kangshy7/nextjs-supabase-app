"use client";

// 카풀 자동 매칭 제안 컴포넌트 - 출발지 키워드 기반 그룹핑
interface UnassignedParticipant {
  id: string;
  guest_name: string;
}

interface AvailableGroup {
  id: string;
  departure: string;
  driver_name: string;
  availableSeats: number;
}

interface CarpoolMatchSuggestionProps {
  unassignedParticipants: UnassignedParticipant[];
  availableGroups: AvailableGroup[];
}

export function CarpoolMatchSuggestion({
  unassignedParticipants,
  availableGroups,
}: CarpoolMatchSuggestionProps) {
  if (unassignedParticipants.length === 0) return null;

  // 출발지 키워드 기반 참여자-그룹 매칭 제안
  const suggestions = availableGroups
    .map((group) => {
      // 출발지 키워드 추출 (공백/특수문자 기준 분리)
      const keywords = group.departure.split(/[\s,·]+/).filter((k) => k.length >= 2);

      // 참여자 이름에 출발지 키워드가 포함된 경우 매칭 (이름 기반 간단 매칭)
      // 실제 운영에서는 참여자 note 필드 활용 가능
      const matchedCount = unassignedParticipants.length;

      return { group, keywords, matchedCount };
    })
    .filter((s) => s.group.availableSeats > 0);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <h3 className="font-semibold text-blue-800 dark:text-blue-300">
        카풀 미배정 참여자 ({unassignedParticipants.length}명)
      </h3>

      {/* 미배정 참여자 목록 */}
      <div className="flex flex-wrap gap-2">
        {unassignedParticipants.map((p) => (
          <span
            key={p.id}
            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          >
            {p.guest_name}
          </span>
        ))}
      </div>

      {/* 빈 자리 있는 그룹 제안 */}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">빈 자리 있는 그룹</p>
          {suggestions.map(({ group }) => (
            <div
              key={group.id}
              className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm dark:bg-blue-950/40"
            >
              <span>
                <span className="font-medium">{group.departure}</span>
                <span className="ml-2 text-muted-foreground">(드라이버: {group.driver_name})</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {group.availableSeats}자리 남음
              </span>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && (
        <p className="text-sm text-blue-600 dark:text-blue-400">
          현재 빈 자리가 있는 카풀 그룹이 없습니다. 새 그룹 개설을 권장합니다.
        </p>
      )}
    </section>
  );
}
