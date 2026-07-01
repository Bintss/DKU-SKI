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
  transaction_type: string
  institution: string | null
  amount: number
  balance_after: number | null
  memo: string | null
  account_code: string | null
  account_label: string | null
  status: 'unclassified' | 'classified' | 'ignored'
  is_deposit_transfer: boolean
  deposit_direction: 'in' | 'out' | null
}

type UploadResult = {
  total: number
  inserted: number
  skipped: number
  autoClassified: number
  autoIgnored: number
  needsClassification: number
}

type DepositAccount = {
  name: string
  balance: number
}

const CURRENT_SEASON = '2026-27'

const STATUS_TABS = [
  { value: 'unclassified', label: '분류 필요' },
  { value: 'classified', label: '분류 완료' },
  { value: 'ignored', label: '무시됨' },
] as const

export default function AdminFinancePage() {
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'unclassified' | 'classified' | 'ignored'>('unclassified')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [depositAccounts, setDepositAccounts] = useState<DepositAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [selectedSeason, setSelectedSeason] = useState(CURRENT_SEASON)
  const [classifyingId, setClassifyingId] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState('')
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ unclassified: 0, classified: 0, ignored: 0 })

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('season', selectedSeason)
      .eq('status', tab)
      .order('traded_at', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }, [supabase, selectedSeason, tab])

  const fetchStats = useCallback(async () => {
    const { data } = await supabase
      .from('finance_transactions')
      .select('status')
      .eq('season', selectedSeason)
    if (data) {
      setStats({
        unclassified: data.filter(d => d.status === 'unclassified').length,
        classified: data.filter(d => d.status === 'classified').length,
        ignored: data.filter(d => d.status === 'ignored').length,
      })
    }
  }, [supabase, selectedSeason])

  const fetchDepositAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('deposit_accounts')
      .select('name, balance')
      .eq('season', selectedSeason)
      .order('name')
    setDepositAccounts(data ?? [])
  }, [supabase, selectedSeason])

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/home'); return }
    fetchTransactions()
    fetchStats()
    fetchDepositAccounts()
  }, [profile, fetchTransactions, fetchStats, fetchDepositAccounts])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('season', selectedSeason)

    const res = await fetch('/api/finance/upload', { method: 'POST', body: formData })
    const result = await res.json()
    setUploading(false)

    if (!res.ok) { alert(result.error ?? '업로드에 실패했어요'); return }

    setUploadResult(result)
    fetchTransactions()
    fetchStats()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClassify = async (tx: Transaction, code: string) => {
    if (!code) return
    const { data: { user } } = await supabase.auth.getUser()
    const isDeposit = code === '320'
    const isIgnore = code === '999'

    // account_label: 원본 메모의 | 이후 설명 유지, 없으면 코드 기본 라벨
    const memoLabel = tx.memo?.match(/^\d+\|(.+)$/)?.[1] ?? null
    const accountLabel = memoLabel ?? ACCOUNT_CODES[code]?.label ?? ''

    await supabase.from('finance_transactions').update({
      account_code: code,
      account_label: accountLabel,
      status: isIgnore ? 'ignored' : 'classified',
      is_deposit_transfer: isDeposit,
      deposit_direction: isDeposit ? (tx.amount >= 0 ? 'in' : 'out') : null,
      classified_by: user?.id,
      classified_at: new Date().toISOString(),
    }).eq('id', tx.id)

    if (isDeposit) {
      const rawLabel = accountLabel.replace(/단기예치금[-–]?/, '').replace(/회수$/, '').trim()
      const accountName = rawLabel || '모임금고'
      const isReturn = accountLabel.includes('회수')
      const delta = isReturn ? Math.abs(tx.amount) : tx.amount

      const { data: existing } = await supabase
        .from('deposit_accounts')
        .select('id, balance')
        .eq('season', selectedSeason)
        .eq('name', accountName)
        .maybeSingle()

      if (existing) {
        await supabase.from('deposit_accounts').update({
          balance: existing.balance + delta,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('deposit_accounts').insert({
          season: selectedSeason,
          name: accountName,
          balance: delta,
        })
      }
    }

    setClassifyingId(null)
    setSelectedCode('')
    fetchTransactions()
    fetchStats()
    fetchDepositAccounts()
  }

  const handleIgnore = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('finance_transactions').update({
      account_code: '999',
      account_label: '미분류',
      status: 'ignored',
      classified_by: user?.id,
      classified_at: new Date().toISOString(),
    }).eq('id', id)
    setClassifyingId(null)
    fetchTransactions()
    fetchStats()
  }

  const handleUnclassify = async (id: string) => {
    await supabase.from('finance_transactions').update({
      account_code: null,
      account_label: null,
      status: 'unclassified',
      is_deposit_transfer: false,
      deposit_direction: null,
      classified_by: null,
      classified_at: null,
    }).eq('id', id)
    fetchTransactions()
    fetchStats()
  }

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })
  }

  const formatAmount = (amount: number) => {
    const abs = Math.abs(amount).toLocaleString()
    return amount >= 0 ? `+${abs}` : `-${abs}`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const renderTxCard = (tx: Transaction) => {
    const isClassifying = classifyingId === tx.id
    const codeInfo = tx.account_code ? ACCOUNT_CODES[tx.account_code] : null
    const txType = tx.account_code ? getTransactionType(tx.account_code, tx.amount) : null

    return (
      <div key={tx.id}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>

        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {tx.description}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                {formatDate(tx.traded_at)}
                {tx.institution && ` · ${tx.institution}`}
              </p>
            </div>
            <p className="text-sm font-black flex-shrink-0"
              style={{ color: tx.amount >= 0 ? 'var(--accent-blue)' : '#F09595' }}>
              {formatAmount(tx.amount)}원
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {codeInfo ? (
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{
                  background: tx.status === 'ignored' ? 'rgba(255,255,255,0.06)'
                    : txType === 'income' ? 'rgba(27,63,171,0.2)'
                    : txType === 'deposit' ? 'rgba(155,89,182,0.2)'
                    : 'rgba(240,149,149,0.15)',
                  color: tx.status === 'ignored' ? 'var(--text-hint)'
                    : txType === 'income' ? 'var(--accent-blue)'
                    : txType === 'deposit' ? 'var(--accent-purple)'
                    : '#F09595',
                }}>
                {tx.account_code} · {tx.account_label ?? codeInfo.label}
              </span>
            ) : (
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,214,0,0.15)', color: '#FFD700' }}>
                미분류
              </span>
            )}
            {tx.memo && (
              <span className="text-xs truncate" style={{ color: 'var(--text-hint)' }}>
                {tx.memo}
              </span>
            )}
          </div>

          <div className="flex gap-2 mt-2.5">
            {tab === 'unclassified' && (
              <>
                <button
                  onClick={() => {
                    setClassifyingId(isClassifying ? null : tx.id)
                    setSelectedCode(tx.account_code ?? '')
                  }}
                  className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
                  style={{
                    background: isClassifying ? 'var(--ski-blue)' : 'rgba(27,63,171,0.15)',
                    color: isClassifying ? '#fff' : 'var(--accent-blue)',
                  }}>
                  {isClassifying ? '취소' : '분류하기'}
                </button>
                <button onClick={() => handleIgnore(tx.id)}
                  className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }}>
                  무시
                </button>
              </>
            )}
            {tab === 'classified' && (
              <button onClick={() => handleUnclassify(tx.id)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg btn-press"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }}>
                분류 취소
              </button>
            )}
            {tab === 'ignored' && (
              <button onClick={() => handleUnclassify(tx.id)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg btn-press"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }}>
                다시 분류
              </button>
            )}
          </div>
        </div>

        {/* 계정코드 선택 패널 */}
        {isClassifying && (
          <div className="px-4 pb-4 pt-3"
            style={{ borderTop: '0.5px solid var(--border-primary)' }}>
            <p className="text-xs font-black mb-3" style={{ color: 'var(--text-hint)' }}>
              계정코드 선택
            </p>

            {[
              { title: '수입', filter: (type: string) => type === 'income' },
              { title: '지출', filter: (type: string) => type === 'expense' },
              { title: '특수 처리', filter: (type: string) => type === 'deposit' || type === 'ignore' },
            ].map(group => (
              <div key={group.title} className="mb-3">
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(ACCOUNT_CODES)
                    .filter(([, info]) => group.filter(info.type))
                    .map(([code, info]) => (
                      <button key={code} type="button"
                        onClick={() => setSelectedCode(code)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold btn-press"
                        style={{
                          background: selectedCode === code ? 'var(--ski-blue)' : 'var(--bg-secondary)',
                          border: `0.5px solid ${selectedCode === code ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                          color: selectedCode === code ? '#fff' : 'var(--text-tertiary)',
                        }}>
                        {code} {info.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}

            {selectedCode && ACCOUNT_CODES[selectedCode] && (
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {ACCOUNT_CODES[selectedCode].description}
              </p>
            )}

            <button onClick={() => handleClassify(tx, selectedCode)}
              disabled={!selectedCode}
              className="w-full text-white rounded-xl py-2.5 text-xs font-black disabled:opacity-40 btn-press"
              style={{ background: 'var(--ski-blue)' }}>
              확정
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderTransactions = () => {
    if (tab === 'unclassified') {
      return <div className="flex flex-col gap-2">{transactions.map(tx => renderTxCard(tx))}</div>
    }

    const grouped = transactions.reduce((acc, tx) => {
      const month = new Date(tx.traded_at)
        .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
      if (!acc[month]) acc[month] = []
      acc[month].push(tx)
      return acc
    }, {} as Record<string, Transaction[]>)

    return (
      <div className="flex flex-col gap-1">
        {Object.entries(grouped).map(([month, txs]) => {
          const isCollapsed = collapsedMonths.has(month)
          const monthTotal = txs.reduce((s, tx) => s + tx.amount, 0)

          return (
            <div key={month}>
              <button onClick={() => toggleMonth(month)}
                className="w-full flex items-center justify-between py-2.5 mb-2"
                style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
                <span className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                  {month} · {txs.length}건
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black"
                    style={{ color: monthTotal >= 0 ? 'var(--accent-blue)' : '#F09595' }}>
                    {monthTotal >= 0 ? '+' : ''}{monthTotal.toLocaleString()}원
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                    {isCollapsed ? '▼' : '▲'}
                  </span>
                </div>
              </button>
              {!isCollapsed && (
                <div className="flex flex-col gap-2 mb-4">
                  {txs.map(tx => renderTxCard(tx))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (profileLoading) return (
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

      {/* 시즌 + 업로드 */}
      <div className="flex items-center gap-2 mb-5">
        <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}
          className="text-sm font-bold rounded-xl px-3 py-2"
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-primary)',
            color: 'var(--text-secondary)',
          }}>
          <option value="2026-27">2026-27</option>
          <option value="2025-26">2025-26</option>
        </select>
        <button onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press disabled:opacity-50"
          style={{ background: 'var(--ski-blue)' }}>
          {uploading ? '업로드 중...' : '📁 거래내역 업로드'}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
          onChange={handleFileUpload} className="hidden" />
      </div>

      {/* 업로드 결과 */}
      {uploadResult && (
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: 'rgba(27,63,171,0.08)', border: '0.5px solid rgba(27,63,171,0.25)' }}>
          <p className="text-xs font-black mb-2" style={{ color: 'var(--accent-blue)' }}>
            업로드 완료
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '신규 추가', value: uploadResult.inserted, color: 'var(--accent-green)' },
              { label: '자동 분류', value: uploadResult.autoClassified, color: 'var(--accent-blue)' },
              { label: '분류 필요', value: uploadResult.needsClassification, color: '#F09595' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-lg font-black" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-hint)' }}>{item.label}</p>
              </div>
            ))}
          </div>
          {uploadResult.skipped > 0 && (
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-hint)' }}>
              중복 {uploadResult.skipped}건 건너뜀
            </p>
          )}
        </div>
      )}

      {/* 예치금 현황 */}
      {depositAccounts.length > 0 && (
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <p className="text-xs font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-hint)' }}>예치금 현황</p>
          <div className="flex flex-col gap-2">
            {depositAccounts.map(acc => (
              <div key={acc.name} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {acc.name}
                </span>
                <span className="text-sm font-black"
                  style={{ color: acc.balance >= 0 ? 'var(--accent-blue)' : '#F09595' }}>
                  {acc.balance.toLocaleString()}원
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2"
              style={{ borderTop: '0.5px solid var(--border-primary)' }}>
              <span className="text-xs font-black" style={{ color: 'var(--text-tertiary)' }}>
                예치금 합계
              </span>
              <span className="text-sm font-black" style={{ color: 'var(--accent-blue)' }}>
                {depositAccounts.reduce((s, a) => s + a.balance, 0).toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 mb-5">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className="flex-1 py-2.5 rounded-xl text-xs font-black btn-press"
            style={{
              background: tab === t.value ? 'var(--ski-blue)' : 'var(--bg-card)',
              border: `0.5px solid ${tab === t.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
              color: tab === t.value ? '#fff' : 'var(--text-tertiary)',
            }}>
            {t.label} ({stats[t.value]})
          </button>
        ))}
      </div>

      {/* 거래 목록 */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl font-black mb-2"
            style={{ color: 'rgba(255,255,255,0.05)' }}>
            {tab === 'unclassified' ? 'ALL CLEAR' : 'EMPTY'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {tab === 'unclassified' ? '분류가 필요한 거래가 없어요'
              : tab === 'classified' ? '분류된 거래가 없어요'
              : '무시된 거래가 없어요'}
          </p>
        </div>
      ) : renderTransactions()}
    </main>
  )
}