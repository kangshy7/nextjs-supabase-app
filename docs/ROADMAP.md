# 모임 이벤트 관리 웹 개발 로드맵

> 작성일: 2026-06-01 | 기준 PRD 버전: 1.0 | 총 예상 기간: 4주

---

## 개요

### 프로젝트 목표

수영·헬스·친구 모임 주최자가 공지·참여자 관리·카풀·정산을 한 곳에서 처리할 수 있는 웹 앱. 카카오톡/스프레드시트/개인 DM 등 분산된 도구를 단일 플랫폼으로 통합한다.

### 기술 스택

| 영역       | 기술                                         |
| ---------- | -------------------------------------------- |
| 프레임워크 | Next.js 15 (App Router), React 19            |
| 언어       | TypeScript (any 타입 사용 금지)              |
| 스타일     | Tailwind CSS, shadcn/ui                      |
| 상태 관리  | Zustand                                      |
| 폼         | React Hook Form + Zod                        |
| 백엔드     | Supabase (PostgreSQL + Auth + RLS)           |
| 인증       | Supabase Auth (쿠키 기반 SSR, @supabase/ssr) |
| 배포       | [확인 필요] Vercel 또는 자체 서버            |

### 팀 구성 가정

- 개발자 1인 (풀스택) 기준 일정
- 스프린트 주기: 2주
- 작업 시간: 하루 약 4~6시간 가정

---

## 아키텍처 결정 사항 (ADR)

| 결정                | 선택                                       | 근거                                                        |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| 실시간 알림         | Phase 3로 연기                             | MVP에서는 페이지 새로고침으로 충분, RLS 연동 복잡도 증가    |
| 카풀 매칭           | 수동 (드라이버 직접 그룹 생성)             | 10~30명 규모에서 자동 알고리즘 효용 낮음                    |
| 정산 분할           | Phase 1: 1/n 균등, Phase 2: 커스텀         | MVP 단순화 원칙 적용                                        |
| 폼 처리             | Server Actions 우선                        | `revalidatePath` 캐시 갱신 + 서버 사이드 유효성 검증 일원화 |
| 비로그인 참여 신청  | `user_id = NULL`, `guest_name` 필수        | 회원가입 없이 참여 유도, 전환율 향상                        |
| Supabase 클라이언트 | 서버: `server.ts`, 클라이언트: `client.ts` | 세션 누수 방지, 요청별 새 인스턴스 생성 원칙                |
| 타입 생성           | `supabase gen types typescript` 자동 생성  | any 타입 금지 정책 준수                                     |

---

## 마일스톤 개요

| 마일스톤 | 목표                          | 시작일          | 완료 예정일 | 상태   |
| -------- | ----------------------------- | --------------- | ----------- | ------ |
| Phase 0  | 인프라 설정 및 DB 스키마 구축 | 2026-06-01      | 2026-06-03  | 대기   |
| Phase 1  | MVP — 이벤트·공지·참여자 관리 | 2026-06-04      | 2026-06-14  | 대기   |
| Phase 2  | 정산·카풀·UX 완성             | 2026-06-15      | 2026-06-28  | 대기   |
| Phase 3  | 실시간·알림·고도화            | 2026-06-29 이후 | 미정        | 백로그 |

---

## Phase 0: 인프라 설정 및 DB 스키마 구축 (2026-06-01 ~ 2026-06-03)

### 목표

개발 착수 전 모든 기반 인프라를 완비한다. DB 스키마, RLS 정책, TypeScript 타입, Zod 유효성 스키마를 선행 구축하여 이후 기능 개발이 막힘 없이 진행될 수 있도록 한다.

### 예상 기간

3일

### 포함 작업

#### DB 마이그레이션

- [ ] `events` 테이블 생성 (host_id, join_code UUID 자동 생성, status CHECK 포함)
- [ ] `announcements` 테이블 생성
- [ ] `event_participants` 테이블 생성 (비로그인 지원: user_id nullable, guest_name 필수 CHECK)
- [ ] `carpool_groups` 테이블 생성
- [ ] `carpool_members` 테이블 생성
- [ ] `expenses` 테이블 생성
- [ ] `expense_splits` 테이블 생성
- [ ] `get_settlement_summary(p_event_id UUID)` RPC 함수 생성
- [ ] 모든 테이블 `updated_at` 자동 갱신 트리거 설정

#### RLS 정책 설정

- [ ] `events` RLS: 주최자 CRUD + 수락된 참여자 SELECT
- [ ] `announcements` RLS: 주최자 INSERT/UPDATE/DELETE + 수락된 참여자 SELECT
- [ ] `event_participants` RLS: 주최자 전체 SELECT + 본인 레코드 SELECT + 비로그인(anon) INSERT
- [ ] `carpool_groups` RLS: 수락된 참여자 SELECT/INSERT + 드라이버 UPDATE/DELETE
- [ ] `carpool_members` RLS: 수락된 참여자 SELECT/INSERT + 드라이버 UPDATE
- [ ] `expenses` RLS: 주최자 CRUD + 수락된 참여자 SELECT
- [ ] `expense_splits` RLS: 주최자 INSERT/UPDATE + 참여자 SELECT
- [ ] Supabase MCP `get_advisors`로 RLS 정책 전체 검증

#### TypeScript 타입 파일

- [ ] `types/event.ts` — `EventCategory`, `EventStatus`, `Event` 인터페이스
- [ ] `types/participant.ts` — `ParticipantStatus`, `EventParticipant` 인터페이스
- [ ] `types/announcement.ts` — `Announcement` 인터페이스
- [ ] `types/carpool.ts` — `CarpoolGroup`, `CarpoolMember` 인터페이스
- [ ] `types/settlement.ts` — `SplitType`, `Expense`, `ExpenseSplit` 인터페이스
- [ ] `supabase gen types typescript`로 DB 타입 자동 생성 및 적용

#### Zod 유효성 스키마

- [ ] `lib/validations/event.ts` — `eventCreateSchema` (title 최대 100자, category enum, event_date 과거 날짜 검사, location 최대 200자, max_participants 양수 정수)
- [ ] `lib/validations/participant.ts` — `joinFormSchema` (guest_name 최대 50자, guest_email 선택, note 최대 200자)
- [ ] `lib/validations/announcement.ts` — `announcementCreateSchema` (title 최대 100자, content 최대 2000자)
- [ ] `lib/validations/settlement.ts` — `expenseCreateSchema` (description 필수, amount 양수)

#### proxy.ts 수정

- [ ] `/events/*` 경로를 인증 리다이렉트 예외 목록에 추가 (비로그인 참여 신청 허용)

```typescript
// 수정 전: /protected가 아닌 경로와 /auth만 예외
// 수정 후: /events/* 경로도 예외 추가
const isPublicPath =
  request.nextUrl.pathname === "/" ||
  request.nextUrl.pathname.startsWith("/auth") ||
  request.nextUrl.pathname.startsWith("/events");
```

#### shadcn/ui 추가 컴포넌트 설치

- [ ] `npx shadcn@latest add dialog` — 확인 다이얼로그 (공지 삭제 등)
- [ ] `npx shadcn@latest add tabs` — 탭 네비게이션
- [ ] `npx shadcn@latest add separator` — 구분선
- [ ] `npx shadcn@latest add textarea` — 텍스트 영역
- [ ] `npx shadcn@latest add select` — 카테고리 선택
- [ ] `npx shadcn@latest add badge` — 상태 배지

### 완료 기준 (Definition of Done)

- [ ] Supabase 대시보드에서 7개 테이블 + 1개 RPC 함수 확인
- [ ] `get_advisors` 실행 시 RLS 경고 없음
- [ ] `types/` 디렉터리 5개 파일 생성 완료
- [ ] `lib/validations/` 디렉터리 4개 파일 생성 완료
- [ ] `npm run type-check` 오류 없음
- [ ] `npm run lint` 오류 없음
- [ ] proxy.ts 수정 후 비로그인 상태로 `/events/test` 접근 시 로그인 페이지로 리다이렉트되지 않음 확인

---

## Phase 1: MVP — 이벤트·공지·참여자 관리 (2026-06-04 ~ 2026-06-14)

### 목표

주최자가 이벤트를 생성하고, 참여자가 공개 링크로 신청하며, 주최자가 수락·거절하고, 공지를 관리할 수 있는 핵심 기능을 완성한다.

**핵심 성공 기준**:

1. 주최자가 이벤트 생성 후 링크 하나로 참여 신청을 받을 수 있다
2. 비로그인 사용자도 공개 링크를 통해 참여 신청이 가능하다

### 예상 기간

11일 (2주 스프린트)

### 기능 우선순위 (MoSCoW)

| 기능                           | 우선순위 |
| ------------------------------ | -------- |
| 이벤트 CRUD                    | Must     |
| 공개 참여 신청 링크            | Must     |
| 비로그인 참여 신청             | Must     |
| 참여자 수락·거절               | Must     |
| 공지 작성·목록                 | Must     |
| 공지 핀 고정                   | Should   |
| 이벤트 목록 빈 상태 CTA        | Should   |
| 반응형 레이아웃 (모바일 390px) | Must     |

### 포함 작업

#### 1-1. 이벤트 목록 페이지 (`/protected/events`)

- [ ] `app/protected/events/page.tsx` 생성 — 서버 컴포넌트
  - `host_id = 현재 사용자` 조건으로 이벤트 목록 서버 렌더링
  - `createClient()`로 Supabase 쿼리 실행
- [ ] `components/events/EventCard.tsx` 생성 — 서버 컴포넌트
  - 제목, 날짜, 장소, 참여자 수, 상태 배지 표시
  - shadcn/ui Badge 컴포넌트로 status 시각화 (active: 초록, cancelled: 빨강, completed: 회색)
- [ ] 빈 상태: 이벤트 없을 때 생성 유도 CTA 표시

#### 1-2. 이벤트 생성 페이지 (`/protected/events/new`)

- [ ] `app/protected/events/new/page.tsx` 생성 — 서버 래퍼 컴포넌트
- [ ] `components/events/EventCreateForm.tsx` 생성 — 클라이언트 컴포넌트 (RHF + Zod)
  - 폼 필드: title, category(select), event_date(datetime-local), location, max_participants, description
  - `eventCreateSchema` Zod 스키마 연동
  - 과거 날짜 입력 시 실시간 유효성 에러 표시
- [ ] `app/protected/events/new/actions.ts` — Server Action
  - `events` 테이블 INSERT (`join_code`는 DB `DEFAULT gen_random_uuid()` 자동 생성)
  - 성공 시 `revalidatePath('/protected/events')` 후 `/protected/events/[id]` redirect
  - 실패 시 에러 메시지 반환

#### 1-3. 이벤트 홈 페이지 (`/protected/events/[id]`)

- [ ] `app/protected/events/[id]/layout.tsx` 생성 — 서버 컴포넌트
  - 탭 네비게이션 (공지 / 참여자 / 카풀 / 정산) — Phase 1에서는 공지·참여자 탭만 활성화
  - `params` await 처리 (Next.js 15 필수)
- [ ] `app/protected/events/[id]/page.tsx` 생성 — 서버 컴포넌트
  - 이벤트 기본 정보 렌더링 (제목, 날짜, 장소, 카테고리, 상태 배지)
  - 핀된 공지 최대 3개 미리보기
  - 참여자 현황 요약 (수락 N명 / 대기 N명)
  - 참여 링크 복사 버튼 (클라이언트 컴포넌트로 분리)
- [ ] `components/events/CopyLinkButton.tsx` 생성 — 클라이언트 컴포넌트
  - `navigator.clipboard.writeText()` 로 `/events/[id]/join?code=[join_code]` 복사
  - 복사 성공/실패 피드백 (토스트 또는 버튼 텍스트 변경)

#### 1-4. 공개 참여 신청 페이지 (`/events/[id]/join`)

- [ ] `app/events/[id]/join/page.tsx` 생성 — 서버 컴포넌트 (비로그인 접근 가능)
  - `searchParams`로 `join_code` 추출 및 DB 검증 (`await` 필수)
  - 유효하지 않은 `join_code` 시 에러 UI 표시
  - 이벤트 기본 정보 미리보기
  - 모집 인원 마감 여부 확인
- [ ] `components/participants/JoinForm.tsx` 생성 — 클라이언트 컴포넌트 (RHF + Zod)
  - 로그인 상태: 프로필에서 guest_name, guest_email 자동 채움
  - 비로그인: guest_name(필수), guest_email(선택) 직접 입력
  - note 필드 (선택, 최대 200자)
  - `joinFormSchema` Zod 스키마 연동
- [ ] `app/events/[id]/join/actions.ts` — Server Action
  - `join_code` 쿼리 파라미터 재검증 (서버 사이드)
  - `event_participants` INSERT (`status = 'pending'`, 비로그인 `user_id = null`)
  - 중복 신청 감지 (동일 `user_id` 또는 `guest_email`) → 안내 메시지 반환
  - `max_participants` 도달 시 신청 거부 → 에러 메시지 반환
  - 모집 마감 시 신청 버튼 비활성화 + 마감 안내 메시지 표시

#### 1-5. 참여자 관리 페이지 (`/protected/events/[id]/participants`)

- [ ] `app/protected/events/[id]/participants/page.tsx` 생성 — 서버 컴포넌트
  - 상태별 필터 탭 (전체 / 대기 / 수락 / 거절)
  - 참여자 목록 서버 렌더링
- [ ] `components/participants/ParticipantRow.tsx` 생성 — 서버 컴포넌트
  - 참여자 이름, 이메일, 신청일, 메모, 상태 배지 표시
- [ ] `components/participants/ParticipantActions.tsx` 생성 — 클라이언트 컴포넌트
  - 수락/거절 버튼 (주최자에게만 표시)
  - `max_participants` 도달 시 수락 버튼 비활성화
- [ ] `app/protected/events/[id]/participants/actions.ts` — Server Actions
  - `acceptParticipant(participantId)`: `status = 'accepted'` UPDATE
    - 트랜잭션 내에서 `max_participants` 도달 여부 재검증
    - 초과 시 에러 반환 (UI 비활성화만으로는 부족)
  - `rejectParticipant(participantId)`: `status = 'rejected'` UPDATE
  - 주최자 권한 서버 사이드 검증 필수

#### 1-6. 공지 관리 페이지 (`/protected/events/[id]/announcements`)

- [ ] `app/protected/events/[id]/announcements/page.tsx` 생성 — 서버 컴포넌트
  - 공지 목록 서버 렌더링 (핀 공지 상단 정렬)
- [ ] `components/announcements/AnnouncementCard.tsx` 생성 — 서버 컴포넌트
  - 제목, 내용, 작성일, 핀 여부 표시
- [ ] `components/announcements/AnnouncementCreateForm.tsx` 생성 — 클라이언트 컴포넌트 (RHF + Zod)
  - title (필수, 최대 100자), content (필수, 최대 2000자)
  - `announcementCreateSchema` Zod 스키마 연동
- [ ] `app/protected/events/[id]/announcements/actions.ts` — Server Actions
  - `createAnnouncement(data)`: `announcements` INSERT
  - `togglePin(announcementId)`: `is_pinned` UPDATE (주최자만)
  - `deleteAnnouncement(announcementId)`: DELETE (주최자만, 확인 다이얼로그 연동)
  - 권한 검증 필수

#### 1-7. QA 및 마무리

- [ ] 모바일 390px 기준 반응형 레이아웃 전체 점검
- [ ] `npm run type-check` 통과 확인
- [ ] `npm run lint` 통과 확인
- [ ] 비로그인 참여 신청 전체 플로우 수동 테스트
- [ ] 주최자 이벤트 생성 → 링크 복사 → 참여 신청 → 수락/거절 전체 플로우 수동 테스트

### 완료 기준 (Definition of Done)

- [ ] 주최자가 이벤트를 생성하고 참여 링크를 복사할 수 있다
- [ ] 비로그인 사용자가 공개 링크로 참여 신청을 완료할 수 있다
- [ ] 주최자가 대기 중인 참여자를 수락 또는 거절할 수 있다
- [ ] `max_participants` 도달 시 신청이 서버 사이드에서 차단된다
- [ ] 주최자가 공지를 작성·핀 고정·삭제할 수 있다
- [ ] 수락된 참여자가 공지를 읽을 수 있다
- [ ] 모바일(390px)에서 주요 기능 사용에 불편함이 없다
- [ ] `npm run type-check` 오류 없음
- [ ] `npm run lint` 오류 없음

---

## Phase 2: 정산·카풀·UX 완성 (2026-06-15 ~ 2026-06-28)

### 목표

정산 1/n 자동 계산, 카풀 그룹 관리, 이벤트 탭 네비게이션 완성, 참여자 본인 취소 기능을 추가하여 완전한 MVP를 완성한다.

**핵심 성공 기준**:

1. 정산 시 1/n 금액 계산과 납부 현황 추적이 자동화된다

### 예상 기간

14일 (2주 스프린트)

### 기능 우선순위 (MoSCoW)

| 기능                              | 우선순위 |
| --------------------------------- | -------- |
| 정산 비용 등록 + 1/n 자동 분할    | Must     |
| 납부 완료 토글                    | Must     |
| `get_settlement_summary` RPC 연동 | Must     |
| 카풀 그룹 생성·신청·수락          | Should   |
| 이벤트 탭 네비게이션 완성         | Must     |
| 참여자 본인 취소 기능             | Should   |
| 이벤트 수정 기능                  | Could    |

### 포함 작업

#### 2-1. 정산 페이지 (`/protected/events/[id]/settlement`)

- [ ] `app/protected/events/[id]/settlement/page.tsx` 생성 — 서버 컴포넌트
  - `get_settlement_summary(event_id)` RPC 호출로 개인별 정산 요약 조회
- [ ] `components/settlement/ExpenseTable.tsx` 생성 — 서버 컴포넌트
  - 비용 목록 (설명, 금액, 납부자, 등록일) 표시
- [ ] `components/settlement/SplitSummaryTable.tsx` 생성 — 서버 컴포넌트
  - 개인별 납부 요약 (총액, 납부 완료, 미납) 표시
- [ ] `components/settlement/ExpenseCreateForm.tsx` 생성 — 클라이언트 컴포넌트 (RHF + Zod)
  - description (필수), amount (필수, 양수), paid_by (기본: 로그인 사용자)
  - `expenseCreateSchema` Zod 스키마 연동
- [ ] `components/settlement/PaymentToggle.tsx` 생성 — 클라이언트 컴포넌트
  - 납부 완료/미납 토글 (주최자만 변경 가능)
- [ ] `app/protected/events/[id]/settlement/actions.ts` — Server Actions
  - `createExpense(data)`:
    - `expenses` INSERT
    - 수락된 참여자 수 조회
    - 1/n 균등 분할 계산: `Math.floor(amount / count * 100) / 100`
    - 나머지 금액은 첫 번째 참여자에게 귀속
    - `expense_splits` INSERT (트랜잭션)
  - `togglePayment(splitId)`: `is_paid = true/false`, `paid_at = now()/null` UPDATE (주최자만)

#### 2-2. 카풀 조정 페이지 (`/protected/events/[id]/carpool`)

- [ ] `app/protected/events/[id]/carpool/page.tsx` 생성 — 서버 컴포넌트
  - 카풀 그룹 목록 렌더링 (출발지, 좌석, 드라이버, 동승자 목록)
- [ ] `components/carpool/CarpoolGroupCreateForm.tsx` 생성 — 클라이언트 컴포넌트
  - departure (출발지, 필수), capacity (좌석 수, 1~8, 필수), memo (선택)
  - 수락된 참여자만 드라이버 그룹 생성 가능
- [ ] `components/carpool/CarpoolJoinButton.tsx` 생성 — 클라이언트 컴포넌트
  - 빈 좌석 있는 그룹에 동승 신청
  - 좌석 만석 시 버튼 비활성화
- [ ] `app/protected/events/[id]/carpool/actions.ts` — Server Actions
  - `createCarpoolGroup(data)`: `carpool_groups` INSERT (수락된 참여자 권한 검증)
  - `joinCarpoolGroup(groupId)`: `carpool_members` INSERT (`status = 'pending'`)
  - `acceptCarpoolMember(memberId)`: `status = 'accepted'` UPDATE (드라이버만)
  - `rejectCarpoolMember(memberId)`: `status = 'rejected'` UPDATE (드라이버만)
  - 좌석 초과 신청 서버 사이드 방지

#### 2-3. 탭 네비게이션 완성

- [ ] `app/protected/events/[id]/layout.tsx` 수정
  - Phase 1에서 비활성화했던 카풀·정산 탭 활성화
  - 현재 활성 탭 하이라이트 (`usePathname` 클라이언트 컴포넌트 또는 서버 렌더링)
- [ ] 각 탭 라우트 이동 정상 동작 확인

#### 2-4. 참여자 본인 취소 기능

- [ ] `app/protected/events/[id]/participants/actions.ts` 수정
  - `cancelParticipation(participantId)`: 본인 레코드 `status = 'cancelled'` UPDATE
  - RLS 정책 준수 (본인만 취소 가능)
- [ ] 참여자 본인 뷰에 "참여 취소" 버튼 추가

#### 2-5. 이벤트 수정 기능 (Could)

- [ ] `components/events/EventEditForm.tsx` 생성 — 클라이언트 컴포넌트 (RHF + Zod)
  - EventCreateForm과 동일한 필드 구성, 기존 데이터 프리필
- [ ] `app/protected/events/[id]/edit/page.tsx` 생성
- [ ] `app/protected/events/[id]/edit/actions.ts` — Server Action (주최자만)

#### 2-6. QA 및 마무리

- [ ] 정산 1/n 계산 정확성 검증 (소수점, 나머지 처리)
- [ ] 카풀 전체 플로우 수동 테스트
- [ ] 탭 네비게이션 전체 라우트 동작 확인
- [ ] 참여자 취소 후 정산 재계산 동작 확인
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과

### 완료 기준 (Definition of Done)

- [ ] 주최자가 비용을 등록하면 수락된 참여자 수로 1/n 자동 분할된다
- [ ] 주최자가 각 참여자의 납부 완료 여부를 토글할 수 있다
- [ ] `get_settlement_summary` RPC 결과가 정산 요약 테이블에 정확히 표시된다
- [ ] 드라이버가 카풀 그룹을 생성하고 동승 신청을 수락·거절할 수 있다
- [ ] 탭 네비게이션 4개 탭(공지·참여자·카풀·정산)이 모두 정상 동작한다
- [ ] 수락된 참여자가 본인 참여를 취소할 수 있다
- [ ] `npm run type-check` 오류 없음
- [ ] `npm run lint` 오류 없음

---

## Phase 3: 실시간·알림·고도화 (백로그, 2026-06-29 이후)

### 목표 (우선순위 순)

이 Phase는 MVP 검증 후 우선순위를 재조정하여 진행한다.

### 백로그 항목

- [ ] **실시간 알림** (Supabase Realtime) — 참여 신청 시 주최자 실시간 알림
- [ ] **이메일 알림** (Supabase Edge Function) — 수락/거절 결과 이메일 발송
- [ ] **카풀 자동 매칭 알고리즘** — 출발지 기반 자동 그룹 제안
- [ ] **정산 리마인더 / 미납 알림** — 미납자에게 알림 발송
- [ ] **이벤트 템플릿** (반복 모임 복사) — 기존 이벤트 설정 복사 기능
- [ ] **공지 댓글 기능** — 공지에 댓글 달기
- [ ] **모바일 PWA** — 홈 화면 추가, 오프라인 지원
- [ ] **정산 커스텀 분할** — 1/n 외 개별 금액 직접 지정

---

## 기술 부채 및 향후 개선사항

| 항목                   | 설명                                               | 우선순위              |
| ---------------------- | -------------------------------------------------- | --------------------- |
| 에러 바운더리          | 페이지별 ErrorBoundary 컴포넌트 도입               | Medium                |
| 로딩 스켈레톤          | `loading.tsx` 파일 추가로 Suspense 활용            | Medium                |
| 낙관적 업데이트        | 수락/거절 버튼 클릭 시 즉각 UI 반응 (Zustand 연동) | Low                   |
| 테스트 코드            | Server Action 단위 테스트, E2E 테스트 (Playwright) | Low                   |
| SEO 메타데이터         | 이벤트 홈 OG 태그 추가 (소셜 공유 시 미리보기)     | Low                   |
| 접근성                 | ARIA 레이블, 키보드 네비게이션 전체 점검           | Medium                |
| `updated_at` 자동 갱신 | DB 트리거로 모든 테이블 일관성 보장                | High (Phase 0에 포함) |

---

## 리스크 레지스터

| 리스크                                        | 영향도 | 발생 가능성 | 대응 전략                                                                                       |
| --------------------------------------------- | ------ | ----------- | ----------------------------------------------------------------------------------------------- |
| RLS 정책 오설정으로 데이터 노출               | 높음   | 중간        | Phase 0에서 `get_advisors` 검증 의무화, 통합 테스트 작성                                        |
| 비로그인 신청 시 anon key RLS 허용 누락       | 높음   | 높음        | `event_participants` INSERT anon 정책 별도 확인, proxy.ts 예외 경로 테스트                      |
| Next.js 15 `params`/`searchParams` await 누락 | 중간   | 높음        | 타입스크립트 컴파일 에러로 조기 감지, 코드 리뷰 체크리스트 항목 추가                            |
| 정산 1/n 소수점 부정확                        | 중간   | 중간        | `Math.floor(amount / count * 100) / 100` 공식 고정, 나머지 첫 번째 참여자 귀속 로직 단위 테스트 |
| 인원 초과 수락 race condition                 | 중간   | 낮음        | Server Action 내 트랜잭션 + `SELECT ... FOR UPDATE`로 방지                                      |
| max_participants 동시 초과 신청               | 중간   | 낮음        | Server Action 내 트랜잭션 검증 (UI 비활성화만으로 부족)                                         |
| supabase gen types 미갱신으로 타입 불일치     | 낮음   | 높음        | 마이그레이션 후 타입 재생성을 Phase 0 DoD에 포함                                                |
| 프로젝트 범위 크리프                          | 높음   | 중간        | Phase 3 항목을 명시적으로 Out of Scope 처리, PRD의 범위(Scope) 섹션 기준 유지                   |

---

## 의존성 맵

```
Phase 0 (인프라)
  └─► Phase 1 (MVP)
        ├─► 1-1 이벤트 목록        (Phase 0: events 테이블)
        ├─► 1-2 이벤트 생성        (Phase 0: events 테이블, eventCreateSchema)
        ├─► 1-3 이벤트 홈          (Phase 0: events 테이블) ← 1-2 완료 후
        ├─► 1-4 공개 참여 신청     (Phase 0: event_participants 테이블, proxy.ts 수정) ← 1-2 완료 후
        ├─► 1-5 참여자 관리        (Phase 0: event_participants 테이블) ← 1-4 완료 후
        └─► 1-6 공지 관리          (Phase 0: announcements 테이블) ← 1-3 완료 후

Phase 2 (확장)
  ├─► 2-1 정산                     (Phase 1: event_participants, expenses, expense_splits, RPC)
  ├─► 2-2 카풀                     (Phase 1: event_participants, carpool_groups, carpool_members)
  ├─► 2-3 탭 네비게이션 완성       (Phase 2: 2-1, 2-2 완료 후)
  └─► 2-4 참여자 본인 취소          (Phase 1: event_participants RLS)

Phase 3 (고도화)
  └─► Phase 2 완료 + MVP 검증 후 진행
```

### 크리티컬 패스

```
Phase 0 DB 스키마 → proxy.ts 수정 → 공개 참여 신청(1-4) → 참여자 관리(1-5) → Phase 2 정산(2-1)
```

---

## 성공 지표 (KPI)

| 지표                      | 측정 방법                                            | 목표값      |
| ------------------------- | ---------------------------------------------------- | ----------- |
| 이벤트 생성 완료율        | 생성 폼 진입 대비 성공 완료 비율                     | 80% 이상    |
| 비로그인 참여 신청 성공률 | 신청 페이지 진입 대비 INSERT 성공 비율               | 90% 이상    |
| 정산 1/n 계산 정확도      | `amount % count != 0` 케이스에서 금액 합계 일치 여부 | 100%        |
| 모바일 레이아웃 적합성    | 390px 뷰포트에서 가로 스크롤 없음                    | 모든 페이지 |
| TypeScript 타입 안전성    | `npm run type-check` 오류 수                         | 0개         |
| 코드 품질                 | `npm run lint` 경고 수                               | 0개         |

---

## 구현 참고사항

### 기존 프로젝트 파일 활용

| 새 기능                   | 참고할 기존 파일                 |
| ------------------------- | -------------------------------- |
| 서버 컴포넌트 데이터 페칭 | `app/protected/profile/page.tsx` |
| RHF + Zod 폼 패턴         | `components/profile-form.tsx`    |
| Server Action 패턴        | `components/logout-button.tsx`   |
| 클라이언트 Supabase 호출  | `components/login-form.tsx`      |
| proxy 경로 예외 처리      | `lib/supabase/proxy.ts`          |

### Next.js 15 필수 주의사항

- `params`, `searchParams`, `cookies()`, `headers()` 모두 `await` 필수 (런타임 에러 방지)
- 서버 컴포넌트에서 `createClient()`는 반드시 함수 내부에서 매번 새로 생성 (전역 변수 금지)
- 클라이언트 컴포넌트에서는 `lib/supabase/client.ts` 사용

### 정산 계산 공식

```typescript
// 소수점 아래 2자리까지 균등 분할
const perPerson = Math.floor((amount / count) * 100) / 100;
// 나머지 금액은 첫 번째 참여자에게 귀속
const remainder = amount - perPerson * count;
```

---

_최종 업데이트: 2026-06-01_
