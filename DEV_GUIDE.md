# 단국대학교 스키부 웹앱 — 개발자 가이드

> 이 문서는 이 프로젝트를 처음 접하는 개발자를 위한 세팅 및 구조 설명입니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [로컬 개발 환경 세팅](#2-로컬-개발-환경-세팅)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [주요 아키텍처](#4-주요-아키텍처)
5. [환경변수](#5-환경변수)
6. [Supabase 설정](#6-supabase-설정)
7. [배포](#7-배포)
8. [주요 기능 구현 방식](#8-주요-기능-구현-방식)

---

## 1. 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS (CSS 변수 기반 라이트 모드) |
| 백엔드/DB | Supabase (PostgreSQL + RLS + Storage) |
| 인증 | Supabase Auth (카카오 OAuth) |
| 배포 | Vercel |
| 푸시 알림 | Web Push API (VAPID) |
| PWA | Next.js PWA (manifest.json + sw.js) |
| 폰트 | Noto Sans KR, Inter (Google Fonts) |

---

## 2. 로컬 개발 환경 세팅

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Git

### 설치

```bash
# 저장소 클론
git clone https://github.com/Bintss/DKU-SKI.git
cd DKU-SKI

# 패키지 설치
npm install

# 환경변수 파일 생성
cp .env.example .env.local
# .env.local 파일을 열어서 값 입력 (아래 환경변수 섹션 참고)

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 빌드 확인

```bash
npm run build
npm run start
```

---

## 3. 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx                      # 랜딩 페이지 (/)
│   │
│   ├── (auth)/                       # 인증 관련 (헤더 없음)
│   │   ├── login/page.tsx            # 로그인
│   │   ├── register/kakao/page.tsx   # 카카오 가입 추가정보
│   │   ├── pending/page.tsx          # 승인 대기
│   │   └── withdrawn/page.tsx        # 탈퇴 안내
│   │
│   ├── (protected)/                  # 로그인 필요 (헤더 + ProfileProvider)
│   │   ├── layout.tsx                # 보호된 레이아웃
│   │   ├── home/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── notices/                  # 공지사항
│   │   ├── camp/                     # 합숙
│   │   ├── events/                   # 행사
│   │   ├── settlement/               # 정산
│   │   ├── finance/page.tsx          # 재무 공시
│   │   ├── community/                # 커뮤니티
│   │   ├── members/                  # 동문 디렉토리
│   │   └── admin/                    # 운영진 전용
│   │       ├── members/page.tsx
│   │       ├── finance/page.tsx
│   │       ├── settings/page.tsx
│   │       ├── events/new/page.tsx
│   │       ├── events/[id]/edit/page.tsx
│   │       └── camps/[id]/edit/page.tsx
│   │
│   └── api/                          # API Routes (서버사이드)
│       ├── admin/                    # 운영진 전용 API
│       │   ├── update-role/          # 권한 변경
│       │   ├── reject-user/          # 가입 거절
│       │   ├── withdraw-user/        # 강제 탈퇴
│       │   └── notify-new-member/    # 신규 가입 알림
│       ├── push/subscribe/           # 푸시 구독 등록
│       ├── finance/upload/           # 거래내역 업로드
│       ├── profile/withdraw/         # 본인 탈퇴
│       └── settlement/
│           ├── create/               # 정산 생성
│           ├── status/               # 정산 상태 변경
│           └── delete/               # 정산 삭제
│
├── components/
│   ├── Header.tsx                    # 상단 헤더 (햄버거 + 비상연락 버튼)
│   ├── Drawer.tsx                    # 사이드 네비게이션
│   ├── EmergencyButton.tsx           # 비상 연락 버튼
│   ├── ImageUpload.tsx               # 이미지 업로드 컴포넌트
│   ├── Skeleton.tsx                  # 로딩 스켈레톤
│   ├── SplashScreen.tsx              # 스플래시 화면
│   └── ServiceWorkerRegister.tsx     # SW 등록
│
├── contexts/
│   └── ProfileContext.tsx            # 전역 유저 프로필 상태
│
├── hooks/
│   ├── useSeason.ts                  # 현재 시즌 (club_settings에서 fetch)
│   └── usePageVisibilityRefetch.ts   # 탭 전환 시 데이터 리패치
│
└── lib/
    ├── supabase.ts                   # Supabase 클라이언트
    ├── push.ts                       # 푸시 알림 구독 (클라이언트)
    ├── push-server.ts                # 푸시 알림 발송 (서버)
    └── finance-codes.ts              # 재무 계정코드 정의
```

---

## 4. 주요 아키텍처

### 인증 흐름

```
카카오 로그인
→ /auth/callback (Supabase OAuth 콜백)
→ profiles.generation = 0이면 /register/kakao (최초 가입)
→ 아니면 /home

middleware.ts
→ role = 'pending' → /pending 리다이렉트
→ role = 'withdrawn' → /withdrawn 리다이렉트 + 로그아웃
```

### RLS 원칙

- 일반 조회: 클라이언트 Supabase (anon key + RLS)
- 권한 변경, 상태 변경 등 민감한 작업: API Route에서 service role key 사용

```typescript
// 클라이언트용 (RLS 적용)
import { createClient } from '@/lib/supabase'
const supabase = createClient()

// 서버용 API Route (RLS 우회)
import { createClient as createAdminClient } from '@supabase/supabase-js'
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### 데이터 리패치 전략

`usePageVisibilityRefetch` 훅을 사용해 탭 전환, 화면 포커스, 페이지 복귀 시 자동 리패치:

```typescript
usePageVisibilityRefetch(fetchData, { enabled: !!profile, debounceMs: 2000 })
```

### CSS 변수 시스템

다크 코드 없이 CSS 변수로 전체 테마 관리 (`globals.css`):

```css
--dku-blue: #00539E
--dku-blue-primary: #003C75
--bg-card: #FFFFFF
--surface-low: #F2F3FA
--text-primary: #191C21
/* ... */
```

---

## 5. 환경변수

`.env.local` 파일에 아래 값을 입력하세요.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 절대 클라이언트에 노출 금지

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BM...
VAPID_PRIVATE_KEY=xxxx
VAPID_SUBJECT=mailto:your@email.com

# 앱 URL
NEXT_PUBLIC_APP_URL=https://dku-ski.vercel.app
```

### VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

---

## 6. Supabase 설정

### 카카오 OAuth 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com) → 앱 설정
2. 플랫폼 → Web 사이트 도메인 추가: `https://dku-ski.vercel.app`
3. 카카오 로그인 → Redirect URI 추가:
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
4. Supabase 대시보드 → Authentication → Providers → Kakao
   - REST API 키, 시크릿 키 입력

### Storage 버킷

| 버킷 | 용도 |
|---|---|
| `avatars` | 프로필 사진 |
| `posts` | 커뮤니티 이미지 |
| `notices` | 공지 이미지/파일 |
| `events` | 행사 이미지 |

### 주요 테이블

자세한 스키마는 `DB_SCHEMA.md` 참고.

---

## 7. 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### 환경변수 설정

Vercel 대시보드 → Settings → Environment Variables에서 `.env.local`과 동일한 값 입력.

### Vercel Cron (비활성 방지)

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/ping", "schedule": "0 9 * * 1" }
  ]
}
```

매주 월요일 오전 9시에 DB에 ping을 보내 Supabase Free 플랜 일시 정지를 방지합니다.

---

## 8. 주요 기능 구현 방식

### 정산 상태 흐름

```
unpaid → pending (부원: "송금했어요")
pending → unpaid (부원: "취소")
pending → paid   (운영진: "확인")
pending → unpaid + reject_reason (운영진: "반려")
paid → unpaid    (운영진: "되돌리기")
```

모든 상태 변경은 `/api/settlement/status`에서 service role로 처리 (RLS 우회).

### 송금명 자동완성

```typescript
// {이름}{transferLabel} → 한글 7자 이내 truncate
const combined = `${name}${transferLabel}`
const transferName = combined.length > 7 ? combined.slice(0, 7) : combined
```

### 재무 집계 원칙

- `is_deposit_transfer = false` 거래만 집계
- `account_code not in (999, 998)` 제외
- 금액 부호 우선: 양수 → 수입, 음수 → 지출 (코드 타입 무관)
- 140(사업운영)은 수입/지출 분리 표시

### 합숙 달력

- `getDatesInRange`: 시작~종료 날짜 배열 생성
- 날짜별 참가자 `participants.filter(p => date >= p.join_date && date <= p.leave_date)`
- 터치 이벤트로 도착일 → 출발일 순차 선택

---

*최종 업데이트: 2026년 7월*
