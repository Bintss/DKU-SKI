# 단국대학교 스키부 웹앱 — DB 스키마

> Supabase PostgreSQL 기반. 모든 테이블은 `public` 스키마에 위치합니다.

---

## 테이블 목록

| 테이블 | 설명 |
|---|---|
| `profiles` | 회원 프로필 |
| `consent_records` | 개인정보/환불 동의 기록 |
| `notices` | 공지사항 |
| `notice_reads` | 공지 읽음 기록 |
| `posts` | 커뮤니티 게시글 |
| `comments` | 댓글 |
| `camps` | 합숙 |
| `camp_participants` | 합숙 참가자 |
| `camp_guests` | 합숙 게스트 |
| `events` | 행사 |
| `event_participants` | 행사 참가자 |
| `settlements` | 정산 |
| `settlement_items` | 정산 항목 (부원별) |
| `finance_transactions` | 재무 거래내역 |
| `deposit_accounts` | 예치금 계좌 |
| `push_subscriptions` | 푸시 알림 구독 |
| `club_settings` | 스키부 운영 설정 |

---

## 테이블 상세

### profiles

회원 프로필. `auth.users`와 1:1 연결.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | auth.users.id 참조 (PK) |
| `name` | text | 이름 |
| `role` | text | `member` / `ob` / `admin` / `pending` / `withdrawn` |
| `generation` | integer | 기수 (0 = 최초 가입 전) |
| `join_type` | text | `student` / `ob` |
| `join_year` | integer | 입부 연도 |
| `membership_type` | text | `regular` / `associate` |
| `avatar_url` | text | 프로필 사진 URL |
| `bio` | text | 자기소개 |
| `phone` | text | 연락처 |
| `gender` | text | `male` / `female` |
| `birth_date` | date | 생년월일 |
| `emergency_contact_name` | text | 비상연락처 이름 |
| `emergency_contact_phone` | text | 비상연락처 번호 |
| `student_id` | text | 학번 |
| `student_id_status` | text | `completed` / `not_issued` / `not_applicable` |
| `affiliation` | text | 소속 (캠퍼스/대학/학과) |
| `ski_level` | text | `beginner` / `novice` / `intermediate` / `advanced` / `certified` |
| `equipment` | text[] | 보유 장비 배열 |
| `camp_intent` | text | `yes` / `no` / `undecided` |
| `refund_bank_name` | text | 환급 은행명 |
| `refund_account_number` | text | 환급 계좌번호 |
| `refund_account_holder` | text | 환급 예금주 |
| `created_at` | timestamptz | 가입일 |

---

### consent_records

개인정보 수집 및 환불 정책 동의 기록.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | profiles.id 참조 |
| `consent_type` | text | `privacy` / `refund_policy` |
| `agreed` | boolean | 동의 여부 |
| `agreed_at` | timestamptz | 동의 시각 |
| `policy_version` | text | 약관 버전 (예: `v1`) |
| `policy_text_snapshot` | text | 동의 당시 약관 전문 |

---

### notices

공지사항.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | 제목 |
| `content` | text | 내용 |
| `image_url` | text | 이미지 URL |
| `file_url` | text | 첨부파일 URL |
| `file_name` | text | 첨부파일 이름 |
| `is_pinned` | boolean | 상단 고정 여부 |
| `author_id` | uuid | profiles.id 참조 |
| `created_at` | timestamptz | 작성일 |
| `updated_at` | timestamptz | 수정일 |

---

### notice_reads

공지 읽음 기록. (unread 배지 계산에 사용)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `notice_id` | uuid | notices.id 참조 |
| `user_id` | uuid | profiles.id 참조 |
| `read_at` | timestamptz | 읽은 시각 |

---

### posts

커뮤니티 게시글.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | 제목 |
| `content` | text | 내용 |
| `channel` | text | `free` / `student` / `ob` |
| `is_anonymous` | boolean | 익명 여부 |
| `image_urls` | text[] | 이미지 URL 배열 |
| `author_id` | uuid | profiles.id 참조 |
| `created_at` | timestamptz | 작성일 |

---

### comments

게시글 댓글.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `post_id` | uuid | posts.id 참조 (CASCADE DELETE) |
| `content` | text | 내용 |
| `is_anonymous` | boolean | 익명 여부 |
| `author_id` | uuid | profiles.id 참조 |
| `created_at` | timestamptz | 작성일 |

---

### camps

합숙.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | 합숙명 |
| `season` | text | 시즌 (예: `2026-27`) |
| `start_date` | date | 시작일 |
| `end_date` | date | 종료일 |
| `location` | text | 장소 |
| `description` | text | 설명 |
| `is_open` | boolean | 신청 오픈 여부 |
| `deadline` | date | 신청 마감일 |
| `max_participants` | integer | 최대 인원 |
| `guest_fee` | integer | 게스트 참가비 |
| `created_by` | uuid | profiles.id 참조 |
| `created_at` | timestamptz | 등록일 |

---

### camp_participants

합숙 참가자.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `camp_id` | uuid | camps.id 참조 (CASCADE DELETE) |
| `user_id` | uuid | profiles.id 참조 |
| `participant_type` | text | `member` / `ob` |
| `join_date` | date | 참가 시작일 |
| `leave_date` | date | 참가 종료일 |
| `label` | text | 차수 레이블 (예: `1차`) |
| `memo` | text | 메모 |
| `status` | text | `confirmed` (기본값) |
| `created_at` | timestamptz | 신청일 |

---

### camp_guests

합숙 게스트.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `camp_id` | uuid | camps.id 참조 (CASCADE DELETE) |
| `name` | text | 게스트 이름 |
| `phone` | text | 연락처 |
| `join_date` | date | 참가 시작일 |
| `leave_date` | date | 참가 종료일 |
| `fee` | integer | 게스트비 |
| `fee_paid` | boolean | 납부 여부 |
| `registered_by` | uuid | profiles.id 참조 |

---

### events

행사.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | 행사명 |
| `event_type` | text | `daytrip` / `training` / `ob_invite` / `etc` |
| `start_date` | date | 시작일 |
| `end_date` | date | 종료일 |
| `location` | text | 장소 |
| `description` | text | 간단 설명 |
| `detail_content` | text | 상세 내용 |
| `image_url` | text | 대표 이미지 URL |
| `deadline` | date | 신청 마감일 |
| `max_participants` | integer | 최대 인원 |
| `participation_fee` | integer | 참가비 (정산 생성에 사용) |
| `guest_fee` | integer | 게스트비 |
| `created_by` | uuid | profiles.id 참조 |
| `created_at` | timestamptz | 등록일 |

---

### event_participants

행사 참가자.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | events.id 참조 (CASCADE DELETE) |
| `user_id` | uuid | profiles.id 참조 |
| `participant_type` | text | `member` (기본값) |
| `join_date` | date | 참가 시작일 |
| `leave_date` | date | 참가 종료일 |
| `memo` | text | 메모 |
| `status` | text | `confirmed` (기본값) |
| `created_at` | timestamptz | 신청일 |

---

### settlements

정산 묶음.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | 정산명 |
| `description` | text | 설명 |
| `total_amount` | integer | 총 금액 |
| `amount_per_person` | integer | 1인당 금액 (균등 분할 시) |
| `due_date` | date | 납부 마감일 |
| `event_id` | uuid | events.id 참조 (행사 연동 시) |
| `transfer_label` | text | 송금명 구분 (예: `합숙비`) |
| `created_by` | uuid | profiles.id 참조 |
| `created_at` | timestamptz | 생성일 |

---

### settlement_items

부원별 정산 항목.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `settlement_id` | uuid | settlements.id 참조 (CASCADE DELETE) |
| `user_id` | uuid | profiles.id 참조 (CASCADE DELETE) |
| `amount` | integer | 납부 금액 |
| `status` | text | `unpaid` / `pending` / `paid` (CHECK 제약) |
| `is_paid` | boolean | 납부 완료 여부 |
| `paid_at` | timestamptz | 납부 확인 시각 |
| `transfer_name` | text | 자동완성 송금명 (예: `홍길동합숙비`) |
| `reject_reason` | text | 반려 사유 (`wrong_transfer_name` / `amount_mismatch` / `other`) |

> **상태 전환 규칙**
> - `unpaid` → `pending`: 부원이 "송금했어요" 클릭
> - `pending` → `paid`: 운영진 "확인" 클릭
> - `pending` → `unpaid` + reject_reason: 운영진 "반려" 클릭
> - `paid` → `unpaid`: 운영진 "되돌리기" 클릭

---

### finance_transactions

재무 거래내역.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `season` | text | 시즌 (예: `2026-27`) |
| `traded_at` | timestamptz | 거래 일시 |
| `description` | text | 거래 설명 |
| `transaction_type` | text | 입금/출금 |
| `institution` | text | 거래 기관 |
| `amount` | integer | 금액 (양수=수입, 음수=지출) |
| `balance_after` | integer | 거래 후 잔액 |
| `memo` | text | 메모 |
| `account_code` | text | 계정코드 (110~999) |
| `account_label` | text | 계정 라벨 |
| `status` | text | `unclassified` / `classified` / `ignored` |
| `is_deposit_transfer` | boolean | 예치금 이동 거래 여부 |
| `deposit_direction` | text | `in` / `out` (예치금 방향) |
| `classified_at` | timestamptz | 분류 시각 |
| `classified_by` | uuid | 분류한 운영진 ID |

> **UNIQUE 제약**: `(season, traded_at, amount)` — 중복 업로드 방지

> **집계 제외 조건**
> - `is_deposit_transfer = true`
> - `account_code IN ('999', '998')`
> - `status != 'classified'`

---

### deposit_accounts

예치금 계좌 잔액.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `season` | text | 시즌 |
| `name` | text | 계좌명 (예: `모임금고`) |
| `balance` | integer | 현재 잔액 |
| `updated_at` | timestamptz | 마지막 업데이트 |

> **UNIQUE 제약**: `(season, name)`

---

### push_subscriptions

Web Push 구독 정보.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | profiles.id 참조 |
| `endpoint` | text | 푸시 엔드포인트 URL |
| `p256dh` | text | 공개키 |
| `auth` | text | 인증 시크릿 |
| `created_at` | timestamptz | 구독 시각 |

---

### club_settings

스키부 운영 설정. 항상 id=1인 단일 행.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | integer | PK (항상 1) |
| `current_season` | text | 현재 시즌 (예: `2026-27`) |
| `bank_name` | text | 스키부 계좌 은행명 |
| `account_number` | text | 스키부 계좌번호 |
| `account_holder` | text | 스키부 예금주 |
| `patrol_phone` | text | 스키 패트롤 연락처 |
| `captain_name` | text | 주장 이름 |
| `captain_phone` | text | 주장 연락처 |
| `coach_name` | text | 훈련팀장 이름 |
| `coach_phone` | text | 훈련팀장 연락처 |
| `updated_at` | timestamptz | 마지막 수정 시각 |
| `updated_by` | uuid | 수정한 운영진 ID |

---

## 재무 계정코드 체계

```
수입
├── 110 가입비       신규 회원 가입비
├── 120 회비         정기 회비
├── 130 합숙비       합숙비 수입
├── 140 사업운영     스키복, 신환회 등 (수입/지출 혼재)
├── 150 후원금       선배 및 외부 후원금
└── 190 기타수입     이자, 캐시백 등

지출
├── 200 활동정산     선결제 등
├── 240 운영비       소프트웨어 구독 등
├── 280 활동지원금   신입생 지원, 교통비 등
└── 300 시즌운영     시즌 중 비용

특수
├── 320 예치금       모임금고, 정기예금 이동 (집계 제외)
├── 998 전기이월     이전 기수 이월금 (집계 제외)
└── 999 미분류       착오송금 등 무시 거래 (집계 제외)
```

> **금액 부호 원칙**: 모든 코드에서 양수 → 수입, 음수 → 지출로 처리.
> 110(가입비) 환불도 음수이면 지출로 집계.

---

*최종 업데이트: 2026년 7월*
