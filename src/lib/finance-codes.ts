export const ACCOUNT_CODES: Record<string, {
  label: string
  type: 'income' | 'expense' | 'ignore' | 'deposit'
  description: string
}> = {
  '110': { label: '가입비',     type: 'income',  description: '신규 회원 가입비' },
  '120': { label: '회비',       type: 'income',  description: '정기 회비 (일괄/분할)' },
  '130': { label: '합숙비',     type: 'income',  description: '합숙비 수입' },
  '140': { label: '사업운영',   type: 'expense', description: '스키복, 신환회 등 특정 목적 수입/지출' },
  '150': { label: '후원금',     type: 'income',  description: '선배 및 외부 후원금' },
  '190': { label: '기타수입',   type: 'income',  description: '통장이자, 캐시백, 본인인증 등' },
  '200': { label: '활동정산',   type: 'expense', description: '선결제 등' },
  '240': { label: '운영비',     type: 'expense', description: '소프트웨어 구독 등 동아리 운영비' },
  '280': { label: '활동지원금', type: 'expense', description: '신입생 지원, 교통비 등' },
  '300': { label: '시즌운영',   type: 'expense', description: '시즌 중 비용' },
  '320': { label: '예치금',     type: 'deposit', description: '모임금고, 정기예금 등 단기예치금 이동' },
  '998': { label: '전기이월',   type: 'income',  description: '이전 기수 이월금' },
  '999': { label: '미분류',     type: 'ignore',  description: '착오송금정리 등 무시해도 되는 거래' },
}

export function getTransactionType(
  code: string,
  amount: number
): 'income' | 'expense' | 'deposit' | 'ignore' {
  const entry = ACCOUNT_CODES[code]
  if (!entry) return 'expense'
  if (entry.type === 'ignore') return 'ignore'
  if (entry.type === 'deposit') return 'deposit'
  // 모든 코드에서 금액 부호 우선
  // 양수 → 수입, 음수 → 지출 (140뿐 아니라 110/120 환불도 동일하게 처리)
  return amount >= 0 ? 'income' : 'expense'
}

// 예치금 계좌 이름 파싱 (예: '320|단기예치금-모임금고' → '모임금고')
export function parseDepositAccountName(accountLabel: string): string {
  const match = accountLabel.match(/단기예치금[-–](.+?)(?:회수)?$/)
  if (match) return match[1].trim()
  return accountLabel
}

// 메모에서 계정코드와 라벨 파싱 (예: '110|가입비' → { code: '110', label: '가입비' })
export function parseMemo(memo: string | null): { code: string | null; label: string | null } {
  if (!memo) return { code: null, label: null }
  const match = memo.match(/^(\d+)\|(.+)$/)
  if (!match) return { code: null, label: null }
  return { code: match[1], label: match[2] }
}