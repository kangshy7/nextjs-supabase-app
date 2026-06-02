# Development Guidelines

## 프로젝트 개요

- **서비스**: 모임 이벤트 관리 웹앱 — 수영·헬스·친구 모임 주최자의 공지·참여자·카풀·정산 통합 관리
- **스택**: Next.js 15 (App Router) + React 19 + TypeScript + Supabase (PostgreSQL + Auth + RLS) + Tailwind CSS + shadcn/ui + React Hook Form + Zod + Zustand
- **인증**: `@supabase/ssr` 쿠키 기반 SSR 인증, `proxy.ts` 미들웨어가 모든 요청에서 세션 갱신
- **현재 상태**: Phase 0 진행 전 — 인증·프로필 기능만 구현됨, 이벤트·공지·참여자·카풀·정산 기능 미구현

---

## 프로젝트 아키텍처

### 디렉터리 구조

```
app/
├── auth/                         # 인증 라우트 (로그인·회원가입·비밀번호)
├── instruments/                  # 기타 페이지 (현재 미사용, 수정 또는 제거 가능)
├── protected/                    # 로그인 필수 보호 페이지
│   ├── events/                   # 이벤트 관리 (Phase 1~2)
│   │   ├── page.tsx              # 내 이벤트 목록
│   │   ├── new/page.tsx          # 이벤트 생성
│   │   └── [id]/
│   │       ├── layout.tsx        # 탭 네비게이션
│   │       ├── page.tsx          # 이벤트 홈
│   │       ├── announcements/    # 공지 관리
│   │       ├── participants/     # 참여자 관리
│   │       ├── carpool/          # 카풀 조정 (Phase 2)
│   │       └── settlement/       # 정산 (Phase 2)
│   └── profile/page.tsx         # 프로필 설정
└── events/[id]/join/page.tsx    # 공개 참여 신청 (비로그인 가능)

components/
├── ui/                          # shadcn/ui 기본 컴포넌트 (수정 금지)
├── events/                      # 이벤트 도메인 컴포넌트
├── participants/                 # 참여자 도메인 컴포넌트
├── announcements/               # 공지 도메인 컴포넌트
├── carpool/                     # 카풀 도메인 컴포넌트
├── settlement/                  # 정산 도메인 컴포넌트
└── tutorial/                    # 초기 설정 안내 (프로덕션에서 제거 가능)

lib/
├── supabase/
│   ├── server.ts                # 서버 Supabase 클라이언트
│   ├── client.ts                # 클라이언트 Supabase 클라이언트
│   └── proxy.ts                 # 미들웨어 세션 갱신 로직 (공개 경로 예외 처리)
├── validations/                 # Zod 유효성 스키마 (도메인별 파일)
│   ├── event.ts                 # eventCreateSchema
│   ├── participant.ts           # joinFormSchema
│   ├── announcement.ts          # announcementCreateSchema
│   └── settlement.ts            # expenseCreateSchema
└── utils.ts                     # cn() 유틸리티, hasEnvVars 플래그

types/                           # TypeScript 도메인 타입
├── profile.ts                   # Profile, ProfileUpdateInput (현재 존재)
│── event.ts                     # Event, EventCategory, EventStatus (Phase 0 생성 예정)
├── participant.ts               # EventParticipant, ParticipantStatus (Phase 0 생성 예정)
├── announcement.ts              # Announcement (Phase 0 생성 예정)
├── carpool.ts                   # CarpoolGroup, CarpoolMember (Phase 0 생성 예정)
└── settlement.ts                # Expense, ExpenseSplit, SplitType (Phase 0 생성 예정)

proxy.ts                         # Next.js 미들웨어 진입점 (matcher 설정)
```

---

## Supabase 클라이언트 선택 규칙

> **잘못 선택하면 세션 누수 또는 세션 갱신 실패가 발생한다.**

| 사용 컨텍스트       | 사용할 파일                                 | 주의사항                                              |
| ------------------- | ------------------------------------------- | ----------------------------------------------------- |
| 서버 컴포넌트       | `lib/supabase/server.ts`의 `createClient()` | 함수 내부에서 **매번 새로 생성**, 전역 변수 절대 금지 |
| Route Handler       | `lib/supabase/server.ts`의 `createClient()` | 동일                                                  |
| Server Action       | `lib/supabase/server.ts`의 `createClient()` | 동일                                                  |
| 클라이언트 컴포넌트 | `lib/supabase/client.ts`의 `createClient()` | —                                                     |
| proxy.ts 미들웨어   | `lib/supabase/proxy.ts`의 `updateSession()` | 직접 호출 금지, `proxy.ts`에서만 호출                 |

- **금지**: 서버 컴포넌트에서 `lib/supabase/client.ts` 사용
- **금지**: 모듈 레벨(전역)에서 `createClient()` 호출

---

## 인증 및 공개 경로 규칙

### 미들웨어 파일 구조

- `proxy.ts` (루트): Next.js 미들웨어 진입점, `matcher` 설정 위치
- `lib/supabase/proxy.ts`: `updateSession()` 내 실제 인증 로직과 **공개 경로 예외 처리** 위치

### 현재 공개 경로 (인증 리다이렉트 예외)

```typescript
// lib/supabase/proxy.ts 내 실제 현재 예외 조건 (Phase 0 완료 전 상태)
pathname === "/";
pathname.startsWith("/auth");
// ⚠️ /events/* 예외는 아직 미적용 — Phase 0에서 추가 필요
```

**Phase 0 TODO**: `/events/*` 경로를 공개 경로로 추가해야 비로그인 참여 신청이 가능하다.

```typescript
// Phase 0 완료 후 목표 상태
pathname === "/";
pathname.startsWith("/auth");
pathname.startsWith("/events"); // 비로그인 참여 신청 허용
```

### 새 공개 경로 추가 시 동시 수정 파일

- `lib/supabase/proxy.ts` — `updateSession()` 내 예외 조건에 경로 추가

### 인증 상태 확인

- `supabase.auth.getClaims()` 사용 (`getUser()` 대비 빠름)
- 서버 컴포넌트에서 인증 실패 시 `redirect('/auth/login')` 호출

---

## Next.js 15 필수 규칙

- `params`, `searchParams`, `cookies()`, `headers()` 모두 **반드시 `await`** — 누락 시 런타임 에러
- 서버 컴포넌트에서 `createClient()`는 **함수 내부에서 호출** (모듈 레벨 금지)
- `revalidatePath()` 호출은 Server Action 내에서만

```typescript
// ✅ 올바른 예
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
}

// ❌ 금지
export default async function Page({ params }: { params: { id: string } }) {
  // params를 await 없이 사용
}
```

---

## 컴포넌트 분류 규칙

### 서버 컴포넌트 (기본)

- DB 쿼리, 서버 데이터 페칭
- 정적 렌더링, 레이아웃, 페이지 래퍼
- 파일에 `"use client"` 없음

### 클라이언트 컴포넌트

- 폼 제출, 클릭 핸들러, 브라우저 API (`navigator.clipboard` 등)
- `useState`, `useEffect` 등 React 훅 사용 시
- 파일 상단에 `"use client"` 필수

### 분리 원칙

- 클라이언트 컴포넌트는 **최소 단위로 분리** — 서버 컴포넌트를 최대한 유지
- 폼은 별도 클라이언트 컴포넌트 파일로 분리, 페이지는 서버 래퍼로 유지
- 예: `page.tsx`(서버) → `EventCreateForm.tsx`(클라이언트) 패턴

### 참고 파일

| 패턴                      | 참고 파일                        |
| ------------------------- | -------------------------------- |
| 서버 컴포넌트 데이터 페칭 | `app/protected/profile/page.tsx` |
| RHF + Zod 폼 패턴         | `components/profile-form.tsx`    |
| Server Action 패턴        | `components/logout-button.tsx`   |
| 클라이언트 Supabase 호출  | `components/login-form.tsx`      |
| proxy 경로 예외 처리      | `lib/supabase/proxy.ts`          |

---

## 폼 구현 규칙

- 모든 폼은 **React Hook Form + Zod** 조합 사용
- Zod 스키마는 `lib/validations/<domain>.ts` 파일에 정의
- 폼 컴포넌트는 `"use client"` 클라이언트 컴포넌트
- `zodResolver` 를 `useForm`의 `resolver`로 사용
- 에러 메시지는 `form.formState.errors.<field>.message`로 렌더링

```typescript
// lib/validations/event.ts 패턴
export const eventCreateSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(["swimming", "gym", "friends", "other"]),
});
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
```

---

## Server Action 규칙

- Server Action 파일은 **`actions.ts`** 이름으로 라우트 폴더 내에 위치
  - 예: `app/protected/events/[id]/participants/actions.ts`
- 모든 Server Action은 **서버 사이드 권한 검증** 필수 (클라이언트 UI 비활성화만으로 부족)
- 인원 제한(`max_participants`) 등 동시성 검증은 **트랜잭션** 내에서 수행
- 뮤테이션 성공 후 **`revalidatePath()`** 호출 필수
- 에러는 `{ error: string }` 형태로 반환, 성공은 `{ data: ... }` 또는 `redirect()`

```typescript
// actions.ts 패턴
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function acceptParticipant(participantId: string) {
  const supabase = await createClient();
  // 권한 검증
  // 트랜잭션 내 비즈니스 로직
  revalidatePath("/protected/events/...");
}
```

---

## TypeScript 타입 규칙

- **`any` 타입 사용 절대 금지** — `unknown` 또는 명시적 타입 사용
- 도메인 타입은 `types/<domain>.ts` 파일에 정의
- DB 스키마 변경 후 `supabase gen types typescript` 실행하여 타입 자동 생성
- 폼 입력 타입은 `z.infer<typeof schema>` 패턴으로 추출

---

## 동시 수정 규칙 (Multi-file Coordination)

| 작업                                               | 반드시 함께 수정할 파일                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| 새 공개 라우트 추가 (`/events/*` 외 비로그인 경로) | `lib/supabase/proxy.ts` — 예외 경로 추가                               |
| 새 DB 테이블 추가                                  | `types/<domain>.ts` 생성 + `lib/validations/<domain>.ts` 생성          |
| DB 스키마 변경                                     | `supabase gen types typescript` 재실행                                 |
| Server Action 권한 로직 변경                       | Supabase RLS 정책도 함께 수정                                          |
| 새 shadcn/ui 컴포넌트 필요                         | `npx shadcn@latest add <component>` 실행 후 `components/ui/` 생성 확인 |

---

## 데이터베이스 규칙

### RLS 정책 원칙

| 테이블               | SELECT                     | INSERT               | UPDATE                | DELETE     |
| -------------------- | -------------------------- | -------------------- | --------------------- | ---------- |
| `events`             | 주최자 + 수락된 참여자     | 로그인 사용자        | 주최자만              | 주최자만   |
| `announcements`      | 주최자 + 수락된 참여자     | 주최자만             | 작성자만              | 작성자만   |
| `event_participants` | 주최자(전체) + 본인 레코드 | 로그인 사용자 + anon | 주최자 + 본인(취소만) | —          |
| `carpool_groups`     | 수락된 참여자              | 수락된 참여자        | 드라이버만            | 드라이버만 |
| `expenses`           | 주최자 + 수락된 참여자     | 주최자만             | 주최자만              | 주최자만   |

- RLS 정책 변경 후 `mcp__supabase__get_advisors`로 검증 필수
- `event_participants` anon INSERT: 비로그인 참여 신청 허용 정책 별도 확인 필수

### 정산 계산 공식 (변경 금지)

```typescript
const perPerson = Math.floor((amount / count) * 100) / 100;
const remainder = amount - perPerson * count;
// 나머지 금액은 첫 번째 참여자에게 귀속
```

### Supabase MCP 사용

- DB 스키마 변경: `mcp__supabase__apply_migration`
- 테이블 조회: `mcp__supabase__list_tables`
- SQL 실행: `mcp__supabase__execute_sql`
- RLS 검증: `mcp__supabase__get_advisors`
- 타입 생성: `mcp__supabase__generate_typescript_types`

---

## 코드 품질 도구

- **pre-commit** (Husky + lint-staged): `*.{ts,tsx}` → ESLint --fix + Prettier --write 자동 실행
- **pre-push**: `tsc --noEmit` 타입 검사
- `npm run knip`: 미사용 파일·exports 감지
- **작업 완료 전 반드시 실행**: `npm run type-check` + `npm run lint`

---

## shadcn/ui 사용 규칙

- `components/ui/` 내 파일은 **직접 수정 금지** — shadcn/ui 재설치 시 덮어써짐
- 새 컴포넌트 추가: `npx shadcn@latest add <component>`
- 이미 추가된 컴포넌트: Button, Input, Card, Label, Badge, Checkbox, DropdownMenu

---

## 금지 사항

- `any` 타입 사용
- 서버 컴포넌트에서 `lib/supabase/client.ts` 임포트
- 모듈 레벨(전역)에서 `createClient()` 호출
- `params`, `searchParams`를 `await` 없이 사용 (Next.js 15)
- Server Action에서 클라이언트 권한 검증만 의존 (서버 사이드 검증 누락)
- `components/ui/` 파일 직접 수정
- Supabase Realtime, Edge Function, PWA — Phase 3 이전 구현 금지
