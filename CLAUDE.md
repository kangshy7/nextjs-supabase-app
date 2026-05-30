# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 15 + Supabase 기반 스타터 킷. 쿠키 기반 인증(`@supabase/ssr`)을 사용하며, App Router 전반(클라이언트 컴포넌트, 서버 컴포넌트, Route Handler, 프록시)에서 Supabase 세션이 동작한다.

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 검사
```

## 환경 변수

`.env.local` 파일에 아래 두 변수가 필요하다. 없으면 앱은 동작하지만 인증 기능이 비활성화된다(`hasEnvVars` 플래그로 분기).

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # anon key도 이 변수명으로 사용 가능
```

## 아키텍처

### 라우트 구조

| 경로                    | 역할                                                     |
| ----------------------- | -------------------------------------------------------- |
| `/`                     | 공개 홈 (미설정 시 튜토리얼, 설정 완료 시 회원가입 안내) |
| `/auth/login`           | 로그인                                                   |
| `/auth/sign-up`         | 회원가입                                                 |
| `/auth/sign-up-success` | 회원가입 완료 안내                                       |
| `/auth/forgot-password` | 비밀번호 재설정 요청                                     |
| `/auth/update-password` | 새 비밀번호 설정                                         |
| `/auth/confirm`         | 이메일 OTP 검증 Route Handler                            |
| `/auth/error`           | 인증 오류 표시                                           |
| `/protected/*`          | 로그인 필수 보호 페이지                                  |

### Supabase 클라이언트 선택 규칙

- **서버 컴포넌트 / Route Handler / Server Action** → `lib/supabase/server.ts`의 `createClient()` 사용. 반드시 함수 내부에서 매번 새로 생성한다(전역 변수 금지).
- **클라이언트 컴포넌트** → `lib/supabase/client.ts`의 `createClient()` 사용.
- **프록시(세션 갱신)** → `lib/supabase/proxy.ts`의 `updateSession()`. `proxy.ts`가 이를 호출하며 모든 요청에 적용된다.

### 인증 흐름

1. `proxy.ts` → 모든 요청에서 `updateSession()` 실행, 세션 쿠키 갱신
2. 비보호 경로(`/`, `/auth/*`) 외 미인증 요청은 `/auth/login`으로 리다이렉트
3. 이메일 인증 링크 클릭 시 `/auth/confirm?token_hash=...&type=...`으로 OTP 검증 후 리다이렉트
4. 인증 상태 확인은 `supabase.auth.getClaims()` 사용 (`getUser()` 대비 빠름)

### 컴포넌트 구조

- `components/ui/` — shadcn/ui 기본 컴포넌트 (Button, Input, Card 등)
- `components/tutorial/` — 초기 설정 안내용 튜토리얼 컴포넌트 (프로덕션 개발 시 제거 가능)
- `components/` 루트 — 인증 관련 폼(`login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`)과 공통 UI

### 기타

- `lib/utils.ts` — `cn()` 유틸리티(clsx + tailwind-merge)와 `hasEnvVars` 환경 변수 체크 플래그
- `next.config.ts` — `cacheComponents: true` (컴포넌트 캐싱 활성화)
- 테마: `next-themes`로 라이트/다크 모드 지원, `ThemeSwitcher` 컴포넌트로 전환
- shadcn/ui 추가 컴포넌트: `npx shadcn@latest add <component>`
