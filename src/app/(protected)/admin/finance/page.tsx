'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { ACCOUNT_CODES, getTransactionType } from '@/lib/finance-codes'

type Transaction = {
  id: string
  season: string
  traded_at: string
  description: string
  transaction_type: string | null
  institution: string | null
  amount: number
  balance_after: number | null
  memo: string | null
  account_code: string | null
  account_label: string | null
  status: 'unclassified' | 'classified' | 'ignored'
  is_deposit_transfer: boolean
  deposit_direction: 'in' | 'out' | null
  classified_at: string | null
}

const CURRENT_SEASON = '2026-27'

const CODE_GROUPS = [
  {
    label: '수입',
    color: 'var(--dku-blue-primary)',
    bg: 'var(--ski-blue-50)',
    border: 'var(--dku-blue-light)',
    codes: [
      { code: '110', label: '가입비' },
      { code: '120', label: '회비' },
      { code: '130', label: '합숙비' },
      { code: '140', label: '사업운영' },
      { code: '150', label: '후원금' },
      { code: '190', label: '기타수입' },
    ],
  },
  {
    label: '지출',
    color: 'var(--accent-red)',
    bg: 'rgba(220,38,38,0.06)',
    border: 'rgba(220,38,38,0.2)',
    codes: [
      { code: '200', label: '활동정산' },
      { code: '240', label: '운영비' },
      { code: '280', label: '활동지원금' },
      { code: '300', label: '시즌운영' },
    ],
  },
  {
    label: '특수',
    color: 'var(--accent-orange)',
    bg: 'rgba(217,119,6,0.06)',
    border: 'rgba(217,119,6,0.2)',
    codes: [
      { code: '320', label: '예치금' },
      { code: '998', label: '전기이월' },
      { code: '999', label: '미분류(무시)' },
    ],
  },
]

export default function AdminFinancePage() {
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [season, setSeason] = useState(CURRENT_SEASON)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'unclassified' | 'classified' | 'ignored'>('unclassified')
  const [classifyingId, setClassifyingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPassword, setUploadPassword] = useState('')
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('season', season)
      .not('account_code', 'in', '(999,998)')
      .order('traded_at', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }, [supabase, season])

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/home'); return }
    fetchData()
  }, [profile, router, fetchData])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('season', season)
    if (uploadPassword) formData.append('password', uploadPassword)

    const res = await fetch('/api/finance/upload', { method: 'POST', body: formData })
    const result = await res.json()
    setUploading(false)
    if (res.ok) {
      setUploadResult(`✓ ${result.inserted}건 추가됨 (중복 ${result.skipped}건 제외)`)
      fetchData()
    } else {
      setUploadResult(`✗ ${result.error ?? '업로드 실패'}`)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClassify = async (txId: string, code: string) => {
    setClassifyingId(txId)
    const tx = transactions.find(t => t.id === txId)
    if (!tx) { setClassifyingId(null); return }

    const entry = ACCOUNT_CODES[code]
    const isIgnore = code === '999'
    const isDeposit = code === '320'
    const txType = getTransactionType(code, tx.amount)
    const isDepositTransfer = isDeposit
    const depositDirection = isDeposit ? (tx.amount > 0 ? 'in' : 'out') : null

    const { error: updateError } = await supabase
      .from('finance_transactions')
      .update({
        account_code: code,
        account_label: entry?.label ?? null,
        status: isIgnore ? 'ignored' : 'classified',
        is_deposit_transfer: isDepositTransfer,
        deposit_direction: depositDirection,
        classified_at: new Date().toISOString(),
        classified_by: profile?.id,
      })
      .eq('id', txId)

    if (!updateError && isDeposit) {
      const accountName = tx.memo ?? tx.description ?? '기타'
      const amount = Math.abs(tx.amount)
      const { data: existing } = await supabase
        .from('deposit_accounts')
        .select('id, balance')
        .eq('season', season)
        .eq('name', accountName)
        .single()

      if (existing) {
        const newBalance = depositDirection === 'in'
          ? existing.balance + amount
          : existing.balance - amount
        await supabase.from('deposit_accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else if (depositDirection === 'in') {
        await supabase.from('deposit_accounts').insert({
          season, name: accountName, balance: amount,
        })
      }
    }

    setClassifyingId(null)
    fetchData()
  }

  const handleUnclassify = async (txId: string) => {
    setClassifyingId(txId)
    await supabase.from('finance_transactions').update({
      account_code: null, account_label: null,
      status: 'unclassified',
      is_deposit_transfer: false, deposit_direction: null,
      classified_at: null, classified_by: null,
    }).eq('id', txId)
    setClassifyingId(null)
    fetchData()
  }

  const groupByMonth = (txList: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {}
    for (const tx of txList) {
      const month = tx.traded_at.slice(0, 7)
      if (!grouped[month]) grouped[month] = []
      grouped[month].push(tx)
    }
    return grouped
  }

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.abs(n)) + '원'
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const tabItems = [
    { value: 'unclassified', label: '분류 필요', count: transactions.filter(t => t.status === 'unclassified').length },
    { value: 'classified', label: '분류 완료', count: transactions.filter(t => t.status === 'classified').length },
    { value: 'ignored', label: '무시됨', count: transactions.filter(t => t.status === 'ignored').length },
  ]

  const displayTx = transactions.filter(t => t.status === tab)
  const groupedTx = groupByMonth(displayTx)
  const months = Object.keys(groupedTx).sort().reverse()

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Admin</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>재무 관리</h1>
      </div>

      {/* 업로드 */}
      <div className="rounded-2xl p-5 mb-5"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <p className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>거래내역 업로드</p>

        <div className="flex gap-2 mb-3">
          <select value={season} onChange={e => setSeason(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: 'var(--surface-low)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}>
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
          </select>
          <input type="password" placeholder="파일 비밀번호 (선택)"
            value={uploadPassword} onChange={e => setUploadPassword(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: 'var(--surface-low)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
            }} />
        </div>

        <button onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl py-3 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
          {uploading ? '업로드 중...' : '토스뱅크 xlsx 파일 선택'}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />

        {uploadResult && (
          <p className="text-xs mt-2 font-bold text-center"
            style={{ color: uploadResult.startsWith('✓') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {uploadResult}
          </p>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 p-1 rounded-2xl"
        style={{ background: 'var(--surface-low)' }}>
        {tabItems.map(t => (
          <button key={t.value}
            onClick={() => setTab(t.value as typeof tab)}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all btn-press"
            style={{
              background: tab === t.value ? '#fff' : 'transparent',
              color: tab === t.value ? 'var(--text-primary)' : 'var(--text-hint)',
              boxShadow: tab === t.value ? 'var(--shadow-sm)' : 'none',
            }}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 font-black"
                style={{
                  color: t.value === 'unclassified' && t.count > 0
                    ? 'var(--accent-red)' : 'var(--text-hint)'
                }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 거래 목록 */}
      {displayTx.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {tab === 'unclassified' ? '분류할 거래가 없어요' :
             tab === 'classified' ? '분류된 거래가 없어요' : '무시된 거래가 없어요'}
          </p>
        </div>
      ) : tab === 'unclassified' ? (
        // 분류 필요 — 전체 펼쳐서 표시
        <div className="flex flex-col gap-3">
          {displayTx.map(tx => (
            <TxCard key={tx.id} tx={tx} tab={tab}
              classifyingId={classifyingId}
              onClassify={handleClassify}
              onUnclassify={handleUnclassify}
              fmt={fmt} fmtDate={fmtDate} />
          ))}
        </div>
      ) : (
        // 분류 완료 / 무시됨 — 월별 그룹
        <div className="flex flex-col gap-3">
          {months.map(month => {
            const isExpanded = expandedMonths[month] !== false
            const monthTx = groupedTx[month]
            const monthTotal = monthTx.reduce((s, t) => s + t.amount, 0)
            return (
              <div key={month} className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                <button
                  onClick={() => setExpandedMonths(prev => ({ ...prev, [month]: !isExpanded }))}
                  className="w-full flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-left" style={{ color: 'var(--text-primary)' }}>
                      {new Date(month + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs mt-0.5 text-left" style={{ color: 'var(--text-hint)' }}>
                      {monthTx.length}건 · 합계 {monthTotal >= 0 ? '+' : '-'}{fmt(monthTotal)}
                    </p>
                  </div>
                  <span className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                    {isExpanded ? '접기 ▲' : '펼치기 ▼'}
                  </span>
                </button>
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-primary)' }}>
                    {monthTx.map(tx => (
                      <TxCard key={tx.id} tx={tx} tab={tab}
                        classifyingId={classifyingId}
                        onClassify={handleClassify}
                        onUnclassify={handleUnclassify}
                        fmt={fmt} fmtDate={fmtDate} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

function TxCard({
  tx, tab, classifyingId, onClassify, onUnclassify, fmt, fmtDate
}: {
  tx: Transaction
  tab: string
  classifyingId: string | null
  onClassify: (id: string, code: string) => void
  onUnclassify: (id: string) => void
  fmt: (n: number) => string
  fmtDate: (s: string) => string
}) {
  const [showPanel, setShowPanel] = useState(false)
  const isLoading = classifyingId === tx.id
  const isIncome = tx.amount > 0

  return (
    <div className={tab === 'unclassified' ? 'rounded-2xl overflow-hidden' : 'overflow-hidden'}
      style={tab === 'unclassified' ? {
        background: '#fff',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)',
      } : {}}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {tx.description}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
              {fmtDate(tx.traded_at)}
              {tx.memo && ` · ${tx.memo}`}
            </p>
            {tx.account_label && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                {tx.account_code} · {tx.account_label}
              </span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base font-black"
              style={{ color: isIncome ? 'var(--dku-blue-primary)' : 'var(--accent-red)' }}>
              {isIncome ? '+' : '-'}{fmt(tx.amount)}
            </p>
            {tx.balance_after !== null && (
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                잔액 {fmt(tx.balance_after)}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {tab === 'unclassified' && (
            <button onClick={() => setShowPanel(!showPanel)}
              disabled={isLoading}
              className="flex-1 rounded-xl py-2 text-xs font-black disabled:opacity-50 btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              {showPanel ? '닫기' : '계정 분류'}
            </button>
          )}
          {(tab === 'classified' || tab === 'ignored') && (
            <button onClick={() => onUnclassify(tx.id)}
              disabled={isLoading}
              className="text-xs font-black px-3 py-1.5 rounded-lg disabled:opacity-50 btn-press"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
              {isLoading ? '...' : tab === 'classified' ? '분류 취소' : '복원'}
            </button>
          )}
        </div>
      </div>

      {/* 계정 분류 패널 */}
      {showPanel && tab === 'unclassified' && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <div className="flex flex-col gap-4 pt-4">
            {CODE_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-black mb-2" style={{ color: group.color }}>
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.codes.map(({ code, label }) => (
                    <button key={code}
                      onClick={() => { onClassify(tx.id, code); setShowPanel(false) }}
                      disabled={isLoading}
                      className="rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 btn-press"
                      style={{
                        background: group.bg,
                        border: `1px solid ${group.border}`,
                        color: group.color,
                      }}>
                      {code} · {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}