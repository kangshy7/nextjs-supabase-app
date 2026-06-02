---
name: project-moim-event
description: 모임 이벤트 관리 웹 MVP — 도메인 특성, 페이즈 구성, 핵심 설계 결정 사항
metadata:
  type: project
---

이 프로젝트는 수영·헬스·친구 모임 주최자가 공지·참여자 관리·카풀·정산을 한 곳에서 처리하는 웹 앱이다.

**Phase 구성**:

- Phase 0 (2026-06-01~03): DB 스키마, RLS, 타입, Zod 스키마, proxy.ts 수정 — 인프라 선행
- Phase 1 (2026-06-04~14): 이벤트 CRUD, 비로그인 참여 신청, 참여자 수락·거절, 공지 관리 — MVP
- Phase 2 (2026-06-15~28): 정산 1/n 자동 분할, 카풀, 탭 네비게이션 완성, 본인 취소
- Phase 3 (미정): Realtime, 이메일 알림, 카풀 자동 매칭 — Out of Scope

**핵심 설계 결정**:

- 비로그인 참여 신청: `user_id = NULL`, `guest_name` 필수, anon key RLS 별도 허용 필요
- proxy.ts `/events/*` 경로 예외 추가 필수 (비로그인 접근 허용)
- Server Actions 우선 (revalidatePath + 서버 사이드 검증)
- 정산: `Math.floor(amount / count * 100) / 100`, 나머지 첫 번째 참여자 귀속
- 인원 초과 수락은 Server Action 내 트랜잭션으로 방지 (UI 비활성화만으로 부족)

**Why:** 카카오톡/스프레드시트/DM 분산 관리 비효율 해소

**How to apply:** 로드맵 일정 및 기능 의존성 확인 시 이 메모리 참조. [[tech-stack-decisions]]
