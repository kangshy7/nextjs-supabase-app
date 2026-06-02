# 모임 이벤트 관리 웹 MVP PRD

> 작성일: 2026-06-01 | 버전: 1.0 | 상태: 초안

---

## 한 줄 요약

수영·헬스·친구 모임 주최자가 공지·참여자 관리·카풀·정산을 한 곳에서 처리할 수 있는 웹 앱.

---

## 문제 정의

- **해결할 문제**: 모임 주최자가 공지는 카카오톡, 참여자 관리는 스프레드시트, 카풀은 개인 DM, 정산은 별도 앱으로 분산 관리하는 비효율
- **성공 기준**:
  1. 주최자가 이벤트 생성 후 링크 하나로 참여 신청을 받을 수 있다
  2. 비로그인 사용자도 공개 링크를 통해 참여 신청이 가능하다
  3. 정산 시 1/n 금액 계산과 납부 현황 추적이 자동화된다

---

## 범위 (Scope)

### ✅ 이번에 만들 것 (Phase 1 — 약 2주)

- [ ] 이벤트 CRUD (생성·목록·홈 페이지)
- [ ] `join_code` UUID 기반 공개 참여 신청 링크
- [ ] 비로그인·로그인 모두 참여 신청 가능
- [ ] 주최자의 참여자 수락·거절
- [ ] 공지 작성·목록·핀 고정

### ✅ 출시 후 빠른 추가 (Phase 2 — 약 2주)

- [ ] 정산 (비용 등록 → 1/n 자동 계산 → 납부 체크)
- [ ] 카풀 그룹 생성·동승 신청·드라이버 수락
- [ ] 이벤트 탭 네비게이션 완성
- [ ] 참여자 본인 취소 기능

### ❌ 이번에 만들지 않을 것 (Out of Scope)

- 실시간 알림 (Supabase Realtime) — Phase 3
- 이메일 알림 (Edge Function) — Phase 3
- 카풀 자동 매칭 알고리즘 — Phase 3
- 정산 리마인더 / 미납 알림 — Phase 3
- 이벤트 템플릿 (반복 모임 복사) — Phase 3
- 공지 댓글 기능 — Phase 3
- 모바일 PWA — Phase 3

---

## 화면 및 기능 명세

### 1. 이벤트 목록 (`/protected/events`)

- **접근 권한**: 로그인 필수
- **주요 UI 요소**: EventCard (제목·날짜·장소·참여자 수·상태 배지), "새 이벤트 만들기" 버튼
- **사용자 액션**:
  1. 페이지 진입 시 `host_id = 현재 사용자` 조건으로 이벤트 목록 서버 렌더링
  2. "새 이벤트 만들기" 버튼 클릭 → `/protected/events/new`로 이동
- **빈 상태**: 이벤트 없을 때 생성 유도 CTA 표시

---

### 2. 이벤트 생성 (`/protected/events/new`)

- **접근 권한**: 로그인 필수
- **주요 UI 요소**: `EventCreateForm` (클라이언트 컴포넌트, RHF + Zod)
- **폼 필드**:

| 필드               | 타입           | 필수 | 유효성                           |
| ------------------ | -------------- | ---- | -------------------------------- |
| `title`            | text           | ✅   | 최대 100자                       |
| `category`         | select         | ✅   | swimming / gym / friends / other |
| `event_date`       | datetime-local | ❌   | 과거 일자 불가                   |
| `location`         | text           | ❌   | 최대 200자                       |
| `max_participants` | number         | ❌   | 1 이상 정수                      |
| `description`      | textarea       | ❌   | 최대 1000자                      |

- **사용자 액션**:
  1. 폼 제출 → Server Action으로 `events` 테이블 INSERT, `join_code` DB 자동 생성
  2. 성공 시 `revalidatePath('/protected/events')` 후 `/protected/events/[id]`로 redirect
- **에러 케이스**: 필수 항목 미입력, 날짜 유효성 오류
- **유효성 검사 힌트**:

```typescript
// lib/validations/event.ts
const eventCreateSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(["swimming", "gym", "friends", "other"]),
  event_date: z.string().optional().refine(/* 과거 날짜 검사 */),
  location: z.string().max(200).optional(),
  max_participants: z.number().int().min(1).optional(),
  description: z.string().max(1000).optional(),
});
```

---

### 3. 이벤트 홈 (`/protected/events/[id]`)

- **접근 권한**: 주최자 또는 수락된 참여자 (RLS로 DB 레벨 강제)
- **레이아웃**: 상단 탭 네비게이션 (공지 / 참여자 / 카풀 / 정산) — `layout.tsx`에서 서버 렌더링
- **주요 UI 요소**:
  - 이벤트 기본 정보 (제목·날짜·장소·카테고리·상태 배지)
  - 핀된 공지 최대 3개 미리보기
  - 참여자 현황 요약 (수락 N명 / 대기 N명)
  - 참여 링크 복사 버튼 → URL: `/events/[id]/join?code=[join_code]`
- **사용자 액션**:
  1. 참여 링크 복사 버튼 클릭 → `navigator.clipboard.writeText()` (클라이언트 컴포넌트)
  2. 탭 클릭 → `<Link>`로 해당 서브 페이지 이동

---

### 4. 공개 참여 신청 (`/events/[id]/join`)

- **URL**: `/events/[id]/join?code=[join_code]`
- **접근 권한**: 누구나 (비로그인 포함) — proxy.ts 예외 처리 필수
- **주요 UI 요소**: 이벤트 정보 미리보기 + `JoinForm` (클라이언트 컴포넌트)
- **폼 필드**:

| 필드          | 비로그인  | 로그인               | 비고             |
| ------------- | --------- | -------------------- | ---------------- |
| `guest_name`  | 직접 입력 | 프로필에서 자동 채움 | 필수             |
| `guest_email` | 직접 입력 | 프로필에서 자동 채움 | 선택             |
| `note`        | 직접 입력 | 직접 입력            | 선택, 최대 200자 |

- **사용자 액션**:
  1. `join_code` 쿼리 파라미터 검증 → 불일치 시 에러 페이지
  2. 신청 제출 → `event_participants` INSERT (`status = 'pending'`, 비로그인은 `user_id = null`)
  3. `max_participants` 도달 시 신청 버튼 비활성화 + 모집 마감 안내
  4. 이미 신청한 경우 (동일 `user_id` 또는 `guest_email`) 중복 안내
- **에러 케이스**: 유효하지 않은 `join_code`, 모집 마감, 중복 신청
- **유효성 검사 힌트**:

```typescript
// lib/validations/participant.ts
const joinFormSchema = z.object({
  guest_name: z.string().min(1, "이름을 입력해주세요").max(50),
  guest_email: z.string().email().optional().or(z.literal("")),
  note: z.string().max(200).optional(),
});
```

---

### 5. 참여자 관리 (`/protected/events/[id]/participants`)

- **접근 권한**: 주최자 전체 목록 / 참여자는 본인 항목만 (RLS 적용)
- **주요 UI 요소**: 상태별 필터 탭 (전체 / 대기 / 수락 / 거절), `ParticipantRow`, `ParticipantActions`
- **사용자 액션 (주최자)**:
  1. 대기 참여자 수락 버튼 → Server Action으로 `status = 'accepted'` UPDATE
  2. 대기 참여자 거절 버튼 → Server Action으로 `status = 'rejected'` UPDATE
  3. `max_participants` 도달 시 수락 버튼 비활성화
- **서버 액션 위치**: `app/protected/events/[id]/participants/actions.ts`
- **에러 케이스**: 인원 초과 수락 시도 (Server Action에서 트랜잭션으로 검증)

---

### 6. 공지 관리 (`/protected/events/[id]/announcements`)

- **접근 권한**: 주최자 작성·삭제 / 수락된 참여자 읽기
- **주요 UI 요소**: `AnnouncementCard` (제목·내용·작성일·핀 여부), `AnnouncementCreateForm`
- **폼 필드**: `title` (필수, 최대 100자), `content` (필수, 최대 2000자)
- **사용자 액션**:
  1. 공지 작성 → Server Action으로 `announcements` INSERT
  2. 핀 토글 → Server Action으로 `is_pinned` UPDATE (주최자만)
  3. 공지 삭제 → Server Action (주최자만), 확인 다이얼로그 표시

---

### 7. 카풀 조정 (`/protected/events/[id]/carpool`) — Phase 2

- **접근 권한**: 수락된 참여자
- **주요 UI 요소**: 카풀 그룹 카드 (출발지·좌석·드라이버·동승자 목록)
- **사용자 액션**:
  1. 드라이버 역할 → `CarpoolGroupCreateForm`으로 그룹 생성 (출발지·좌석 수)
  2. 동승 희망자 → 빈 좌석 있는 그룹에 `CarpoolJoinButton`으로 신청
  3. 드라이버 → 동승 신청 수락/거절
  4. 좌석 만석 시 신청 버튼 비활성화

---

### 8. 정산 (`/protected/events/[id]/settlement`) — Phase 2

- **접근 권한**: 주최자 (납부 체크 권한) / 수락된 참여자 (조회만)
- **주요 UI 요소**: `ExpenseTable`, `SplitSummaryTable`, `ExpenseCreateForm`, `PaymentToggle`
- **폼 필드**: `description` (필수), `amount` (필수, 양수), `paid_by` (기본: 로그인 사용자)
- **사용자 액션**:
  1. 비용 등록 → Server Action으로 수락된 참여자 수로 1/n 자동 분할 → `expense_splits` INSERT
  2. 납부 완료 토글 → `is_paid = true`, `paid_at = now()` UPDATE
  3. `get_settlement_summary(event_id)` RPC로 개인별 정산 요약 조회
- **정산 계산**: `Math.floor(amount / count * 100) / 100`, 나머지 금액은 첫 번째 참여자에게 귀속
- **서버 액션 위치**: `app/protected/events/[id]/settlement/actions.ts`

---

## 데이터 모델

```typescript
// types/event.ts
type EventCategory = "swimming" | "gym" | "friends" | "other";
type EventStatus = "active" | "cancelled" | "completed";

interface Event {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  event_date: string | null;
  location: string | null;
  max_participants: number | null;
  join_code: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

// types/participant.ts
type ParticipantStatus = "pending" | "accepted" | "rejected" | "cancelled";

interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string | null; // 비로그인 신청 시 null
  guest_name: string | null;
  guest_email: string | null;
  status: ParticipantStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// types/announcement.ts
interface Announcement {
  id: string;
  event_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// types/carpool.ts
interface CarpoolGroup {
  id: string;
  event_id: string;
  driver_id: string;
  departure: string;
  capacity: number;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

interface CarpoolMember {
  id: string;
  carpool_group_id: string;
  participant_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

// types/settlement.ts
type SplitType = "equal" | "custom";

interface Expense {
  id: string;
  event_id: string;
  paid_by: string;
  description: string;
  amount: number;
  split_type: SplitType;
  created_at: string;
  updated_at: string;
}

interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}
```

---

## 데이터베이스 스키마

```sql
-- 이벤트 마스터
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN ('swimming', 'gym', 'friends', 'other')),
  event_date      TIMESTAMPTZ,
  location        TEXT,
  max_participants INTEGER,
  join_code       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 공지
CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_pinned  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 참여자 (비로그인 신청 지원)
CREATE TABLE event_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name  TEXT,
  guest_email TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_event UNIQUE (event_id, user_id),
  CONSTRAINT guest_or_user CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL)
);

-- 카풀 그룹
CREATE TABLE carpool_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  departure  TEXT NOT NULL,
  capacity   INTEGER NOT NULL DEFAULT 3 CHECK (capacity BETWEEN 1 AND 8),
  memo       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 카풀 동승자
CREATE TABLE carpool_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carpool_group_id UUID NOT NULL REFERENCES carpool_groups(id) ON DELETE CASCADE,
  participant_id   UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_carpool_member UNIQUE (carpool_group_id, participant_id)
);

-- 비용 항목
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  paid_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  split_type  TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 분담 내역
CREATE TABLE expense_splits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id     UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  amount         NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  is_paid        BOOLEAN NOT NULL DEFAULT false,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_expense_split UNIQUE (expense_id, participant_id)
);

-- 정산 요약 집계 RPC
CREATE OR REPLACE FUNCTION get_settlement_summary(p_event_id UUID)
RETURNS TABLE (
  participant_id UUID,
  display_name   TEXT,
  total_amount   NUMERIC,
  paid_amount    NUMERIC,
  unpaid_amount  NUMERIC
) AS $$
  SELECT
    es.participant_id,
    COALESCE(pr.full_name, ep.guest_name, ep.guest_email) AS display_name,
    SUM(es.amount)                                         AS total_amount,
    SUM(CASE WHEN es.is_paid THEN es.amount ELSE 0 END)   AS paid_amount,
    SUM(CASE WHEN NOT es.is_paid THEN es.amount ELSE 0 END) AS unpaid_amount
  FROM expense_splits es
  JOIN expenses ex ON ex.id = es.expense_id
  JOIN event_participants ep ON ep.id = es.participant_id
  LEFT JOIN profiles pr ON pr.id = ep.user_id
  WHERE ex.event_id = p_event_id
  GROUP BY es.participant_id, display_name;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## RLS 정책 요약

| 테이블               | SELECT                     | INSERT                         | UPDATE                | DELETE     |
| -------------------- | -------------------------- | ------------------------------ | --------------------- | ---------- |
| `events`             | 주최자 + 수락된 참여자     | 로그인 사용자                  | 주최자만              | 주최자만   |
| `announcements`      | 주최자 + 수락된 참여자     | 주최자만                       | 작성자만              | 작성자만   |
| `event_participants` | 주최자(전체) + 본인 레코드 | 로그인 사용자 + anon(비로그인) | 주최자 + 본인(취소만) | —          |
| `carpool_groups`     | 수락된 참여자              | 수락된 참여자                  | 드라이버만            | 드라이버만 |
| `carpool_members`    | 수락된 참여자              | 수락된 참여자                  | 드라이버만            | —          |
| `expenses`           | 주최자 + 수락된 참여자     | 주최자만                       | 주최자만              | 주최자만   |
| `expense_splits`     | 주최자 + 수락된 참여자     | 주최자만                       | 주최자만              | —          |

---

## 라우트 구조

```
app/
├── protected/events/
│   ├── page.tsx                          # 내 이벤트 목록 (서버 컴포넌트)
│   ├── new/page.tsx                      # 이벤트 생성 (서버 래퍼 + 클라이언트 폼)
│   └── [id]/
│       ├── layout.tsx                    # 탭 네비게이션 (서버 컴포넌트)
│       ├── page.tsx                      # 이벤트 홈 (서버 컴포넌트)
│       ├── announcements/page.tsx        # 공지 목록·작성 (서버)
│       ├── participants/
│       │   ├── page.tsx                  # 참여자 관리 (서버)
│       │   └── actions.ts               # Server Actions (수락/거절, 인원 제한 검증)
│       ├── carpool/page.tsx              # 카풀 조정 (서버) — Phase 2
│       └── settlement/
│           ├── page.tsx                  # 정산 (서버) — Phase 2
│           └── actions.ts               # Server Actions (1/n 계산, 트랜잭션) — Phase 2
└── events/[id]/join/page.tsx             # 공개 참여 신청 (서버, 비로그인 가능)
```

---

## 컴포넌트 구조

```
components/
├── events/
│   ├── EventCard.tsx              # 이벤트 카드 (서버 컴포넌트)
│   ├── EventCreateForm.tsx        # 생성 폼 (클라이언트, RHF + Zod)
│   └── EventEditForm.tsx          # 수정 폼 (클라이언트)
├── announcements/
│   ├── AnnouncementCard.tsx       # 공지 카드 (서버 컴포넌트)
│   └── AnnouncementCreateForm.tsx # 작성 폼 (클라이언트)
├── participants/
│   ├── ParticipantRow.tsx         # 참여자 행 (서버 컴포넌트)
│   ├── ParticipantActions.tsx     # 수락/거절 버튼 (클라이언트)
│   └── JoinForm.tsx               # 참여 신청 폼 (클라이언트, 로그인 분기)
├── carpool/
│   ├── CarpoolGroupCreateForm.tsx # 그룹 생성 폼 (클라이언트)
│   └── CarpoolJoinButton.tsx      # 동승 신청 버튼 (클라이언트)
└── settlement/
    ├── ExpenseTable.tsx           # 비용 목록 (서버 컴포넌트)
    ├── ExpenseCreateForm.tsx      # 비용 등록 폼 (클라이언트)
    ├── SplitSummaryTable.tsx      # 정산 요약 (서버 컴포넌트)
    └── PaymentToggle.tsx          # 납부 완료 토글 (클라이언트)
```

---

## 개발 체크리스트

### Phase 1

- [ ] DB 스키마 마이그레이션 적용 (Supabase MCP `apply_migration` 또는 CLI)
- [ ] RLS 정책 전체 적용 후 `get_advisors`로 검증
- [ ] `types/` 파일 5종 생성 (`event.ts`, `announcement.ts`, `participant.ts`, `carpool.ts`, `settlement.ts`)
- [ ] `lib/validations/` Zod 스키마 파일 생성
- [ ] `proxy.ts` 경로 예외 추가 (`/events/*` — 비로그인 접근 허용)
- [ ] 이벤트 목록·생성·홈 페이지 구현
- [ ] 공개 참여 신청 페이지 구현 (비로그인/로그인 분기 포함)
- [ ] 참여자 수락·거절 Server Action 구현 (인원 제한 검증 포함)
- [ ] 공지 작성·목록·핀 기능 구현
- [ ] 반응형 레이아웃 확인 (모바일 390px 기준)
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과

### Phase 2

- [ ] 정산 비용 등록 + 1/n 자동 분할 계산 (Server Action 트랜잭션)
- [ ] `get_settlement_summary` RPC 함수 적용
- [ ] 납부 완료 토글 기능
- [ ] 카풀 그룹 생성·신청·수락 구현
- [ ] 이벤트 탭 네비게이션 완성
- [ ] 참여자 본인 취소 기능

---

## 구현 힌트

### 참고할 기존 파일

| 새 기능                        | 참고 파일                        |
| ------------------------------ | -------------------------------- |
| 서버 컴포넌트 데이터 페칭 패턴 | `app/protected/profile/page.tsx` |
| RHF + Zod 폼 패턴              | `components/profile-form.tsx`    |
| Server Action 패턴             | `components/logout-button.tsx`   |
| 클라이언트 Supabase 호출       | `components/login-form.tsx`      |
| proxy 경로 예외 처리           | `proxy.ts`                       |

### shadcn/ui 추가 컴포넌트 (필요 시)

```bash
npx shadcn@latest add dialog      # 확인 다이얼로그 (공지 삭제 등)
npx shadcn@latest add tabs        # 탭 네비게이션
npx shadcn@latest add separator   # 구분선
npx shadcn@latest add textarea    # 텍스트 영역
npx shadcn@latest add select      # 카테고리 선택
```

### Supabase 클라이언트 선택 규칙

- 서버 컴포넌트 / Route Handler / Server Action → `lib/supabase/server.ts`의 `createClient()` (함수 내부에서 매번 새로 생성)
- 클라이언트 컴포넌트 → `lib/supabase/client.ts`의 `createClient()`
- 비로그인 참여 신청은 `anon key` RLS 정책 별도 확인 필요

### proxy.ts 수정 위치

현재 `proxy.ts`의 `updateSession()` 내부에서 `/protected/*` 외 경로는 인증 리다이렉트를 건너뛰도록 처리한다. `/events/*` 경로를 리다이렉트 예외 목록에 추가해야 한다.

```typescript
// lib/supabase/proxy.ts 수정 예시
const isPublicPath = !url.pathname.startsWith("/protected") || url.pathname.startsWith("/events");
```

### 핵심 설계 결정

| 결정 사항         | 선택                                 | 이유                                          |
| ----------------- | ------------------------------------ | --------------------------------------------- |
| Supabase Realtime | Phase 3                              | MVP에서는 폴링으로 충분, RLS 연동 복잡도 증가 |
| 카풀 매칭         | 수동 (드라이버 직접 그룹 생성)       | 10~30명 규모에서 자동 알고리즘 효용 낮음      |
| 정산 분할         | 1/n 균등 (Phase 1), 커스텀 (Phase 2) | MVP 단순화                                    |
| 폼 처리           | Server Actions 우선                  | `revalidatePath` 캐시 갱신 + 서버 사이드 검증 |
| 비로그인 신청     | `user_id = NULL`, `guest_name` 필수  | 회원가입 없이 참여 유도                       |

### 주의사항

- Next.js 15: `params`, `searchParams`, `cookies()`, `headers()` 모두 `await` 필수 (런타임 에러 방지)
- `any` 타입 사용 절대 금지 — `supabase gen types typescript`로 자동 생성 타입 활용
- 정산 1/n 계산 시 소수점 처리: `Math.floor(amount / count * 100) / 100`
- `max_participants` 도달 여부는 Server Action 내 트랜잭션에서 검증 (UI 비활성화만으로는 부족)
