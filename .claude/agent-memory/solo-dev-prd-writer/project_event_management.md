---
name: project-event-management
description: 모임 이벤트 관리 MVP — 핵심 도메인, 데이터 모델, 라우트 구조 및 Phase 구분 요약
metadata:
  type: project
---

이 프로젝트는 수영·헬스·친구 모임을 위한 이벤트 관리 웹 MVP다 (Phase 1 완료 목표: 약 2026-06-15).

## 핵심 도메인 개념

- **이벤트(event)**: 모임 마스터. `host_id`, `join_code`(UUID), `max_participants`, `status(active/cancelled/completed)`
- **참여자(event_participants)**: `user_id = NULL` 허용으로 비로그인 신청 지원. `guest_name` 필수 시 비로그인
- **공지(announcements)**: `is_pinned` 필드로 핀 고정, 주최자만 작성
- **카풀(carpool_groups + carpool_members)**: 수동 매칭, 드라이버가 직접 그룹 생성
- **정산(expenses + expense_splits)**: 1/n 균등 분할, `get_settlement_summary(event_id)` RPC로 집계

## Phase 구분

- **Phase 1** (약 2주): 이벤트 CRUD, 공개 참여 신청(비로그인 포함), 참여자 수락/거절, 공지
- **Phase 2** (약 2주): 정산, 카풀, 탭 네비게이션, 본인 취소
- **Phase 3** (향후): Realtime, 이메일 알림, 자동 카풀 매칭, PRD 댓글

## 라우트 구조 패턴

- 보호 경로: `/protected/events/*` (로그인 필수)
- 공개 경로: `/events/[id]/join` (비로그인 가능) — proxy.ts 예외 처리 필요

## 중요 설계 결정

- `any` 타입 금지, `supabase gen types` 자동 생성 타입 활용
- Server Actions 우선 (revalidatePath + 서버 검증)
- Next.js 15: params/searchParams/cookies 모두 await 필수
- 인원 제한은 UI뿐 아니라 Server Action 트랜잭션에서도 검증

**Why:** 분산된 모임 관리 도구(카카오톡·스프레드시트·정산앱)를 단일 웹앱으로 통합하기 위함
**How to apply:** 새 PRD 요청 시 이 도메인 컨텍스트를 기반으로 일관된 타입명·테이블명·라우트 경로를 유지할 것
