'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'
import { ACCOUNT_CODES, getTransactionType } from '@/lib/finance-codes'
import { useSeason } from '@/hooks/useSeason'

type AccountSummary = {
  code: string
  label: string
  amount: number
  type: 'income' | 'expense'
  count: number
}

type DepositAccount = {
  name: string
  balance: number
}

type Transaction = {
  id: string
  traded_at: string
  description: string
  amount: number
  account_code: string | null
  account_label: string | null
  is_deposit_transfer: boolean
}

export default function FinancePage() {
  const { profile, loading: profileLoading } = useProfile()
  const { season: currentSeason, loading: seasonLoading } = useSeason()
  const [season, setSeason] = useState<string>('')
  const [summary, setSummary] = useState<AccountSummary[]>([])
  const [depositAccounts, setDepositAccounts] = useState<DepositAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [txOpen, setTxOpen] = useState(false)
  const [filterCode, setFilterCode] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (currentSeason && !season) setSeason(currentSeason)
  }, [currentSeason])

  const fetchData = useCallback(async () => {
    if (!season) return
    setLoading(true)
    const [{ data: txData }, { data: depositData }] = await Promise.all([
      supabase
        .from('finance_transactions')
        .select('id, traded_at, description, amount, account_code, account_label, is_deposit_transfer')
        .eq('season', season)
        .eq('status', 'classified')
        .eq('is_deposit_transfer', false)
        .not('account_code', 'in', '(999,998)')
        .order('traded_at', { ascending: false }),
      supabase
        .from('deposit_accounts')
        .select('name, balance')
        .eq('season', season)
        .order('name'),
    ])

    const allTx = txData ?? []
    setLastUpdatedAt(allTx.length > 0 ? allTx[0].traded_at : null)
    setTransactions(allTx)
    setDepositAccounts(depositData ?? [])

    // 홈화면과 동일한 집계 방식
    // 수입: 양수 그대로 누적 / 지출: 음수 그대로 누적
    const grouped: Record<string, AccountSummary> = {}
    for (const tx of allTx) {
      if (!tx.account_code) continue
      const code = tx.account_code
      const txType = getTransactionType(code, tx.amount)
      if (txType === 'ignore' || txType === 'deposit') continue
      const actualType: 'income' | 'expense' = txType === 'income' ? 'income' : 'expense'
      const groupKey = code === '140' ? `140_${actualType}` : code
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          code,
          label: code === '140'
            ? (actualType === 'income' ? '사업운영 (수입)' : '사업운영 (지출)')
            : (ACCOUNT_CODES[code]?.label ?? tx.account_label ?? code),
          amount: 0,
          type: actualType,
          count: 0,
        }
      }
      grouped[groupKey].amount += tx.amount
      grouped[groupKey].count += 1
    }

    setSummary(
      Object.values(grouped).sort((a, b) =>
        a.type === b.type
          ? Math.abs(b.amount) - Math.abs(a.amount)
          : a.type === 'income' ? -1 : 1
      )
    )
    setLoading(false)
  }, [supabase, season])

  useEffect(() => { fetchData() }, [fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!season, debounceMs: 5000 })

  // 홈화면과 동일한 총합 계산
  const totalIncome = summary
    .filter(s => s.type === 'income')
    .reduce((sum, s) => sum + s.amount, 0)

  const totalExpense = summary
    .filter(s => s.type === 'expense')
    .reduce((sum, s) => sum + Math.abs(s.amount), 0)

  const balance = totalIncome - totalExpense
  const totalDeposit = depositAccounts.reduce((s, a) => s + a.balance, 0)
  const totalAsset = balance + totalDeposit

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.abs(n)) + '원'

  const formatLastUpdated = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) + ' 기준'

  const getFilterKey = (s: AccountSummary) => s.code === '140' ? `140_${s.type}` : s.code

  const filteredTx = filterCode
    ? transactions.filter(tx => {
        if (filterCode === '140_income') return tx.account_code === '140' && tx.amount >= 0
        if (filterCode === '140_expense') return tx.account_code === '140' && tx.amount < 0
        return tx.account_code === filterCode
      })
    : transactions

  const filteredLabel = filterCode
    ? summary.find(s => getFilterKey(s) === filterCode)?.label ?? filterCode
    : null

  const seasonOptions = (() => {
    if (!currentSeason) return []
    const [startYear] = currentSeason.split('-').map(Number)
    return Array.from({ length: 4 }, (_, i) => {
      const y = startYear - i
      return `${y}-${String(y + 1).slice(-2)}`
    })
  })()

  if (profileLoading || seasonLoading || loading || !season) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Finance</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>재무 공시</h1>
          {lastUpdatedAt && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-hint)' }}>
              {formatLastUpdated(lastUpdatedAt)}
            </p>
          )}
        </div>
        <select value={season} onChange={e => { setSeason(e.target.value); setFilterCode(null) }}
          className="text-xs font-bold rounded-xl px-3 py-2 flex-shrink-0"
          style={{
            background: '#fff',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
            outline: 'none',
          }}>
          {seasonOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--dku-blue-primary) 0%, var(--dku-blue) 100%)',
          boxShadow: 'var(--shadow-blue)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%,-30%)' }} />

        <p className="text-xs font-black tracking-widest uppercase mb-4"
          style={{ color: 'rgba(255,255,255,0.5)' }}>{season} 시즌</p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>수입</p>
            <p className="text-lg font-black text-white">
              {(totalIncome / 10000).toFixed(0)}만
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>지출</p>
            <p className="text-lg font-black" style={{ color: 'rgba(255,180,180,0.9)' }}>
              {(totalExpense / 10000).toFixed(0)}만
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>잔액</p>
            <p className="text-lg font-black"
              style={{ color: balance >= 0 ? 'rgba(180,255,200,0.9)' : 'rgba(255,180,180,0.9)' }}>
              {(balance / 10000).toFixed(0)}만
            </p>
          </div>
        </div>

        {totalDeposit > 0 && (
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>
                예치금 포함 총 자산
              </p>
              <p className="text-base font-black text-white">
                {(totalAsset / 10000).toFixed(0)}만원
              </p>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              예치금 {(totalDeposit / 10000).toFixed(0)}만원 포함
            </p>
          </div>
        )}

        <div className="h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          <div className="h-full rounded-full"
            style={{
              width: `${Math.min(totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0, 100)}%`,
              background: 'rgba(255,255,255,0.7)',
            }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          예산 집행률 {totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}%
        </p>
      </div>

      {/* 예치금 현황 */}
      {depositAccounts.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-hint)' }}>예치금 현황</h2>
          <div className="flex flex-col gap-2">
            {depositAccounts.map(acc => (
              <div key={acc.name} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{acc.name}</span>
                <span className="text-sm font-black" style={{ color: 'var(--dku-blue-primary)' }}>
                  {fmt(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 항목별 내역 */}
      {summary.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-hint)' }}>항목별 내역</h2>

          {/* 수입 */}
          {summary.filter(s => s.type === 'income').length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-black mb-3" style={{ color: 'var(--dku-blue)' }}>수입</p>
              <div className="flex flex-col gap-3">
                {summary.filter(s => s.type === 'income').map(s => {
                  const fk = getFilterKey(s)
                  const isActive = filterCode === fk
                  return (
                    <button key={fk} type="button"
                      onClick={() => { setFilterCode(isActive ? null : fk); setTxOpen(true) }}
                      className="w-full text-left">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold flex items-center gap-1.5"
                          style={{ color: isActive ? 'var(--dku-blue-primary)' : 'var(--text-secondary)' }}>
                          {s.label}
                          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>{s.count}건</span>
                        </span>
                        <span className="font-black" style={{ color: 'var(--dku-blue-primary)' }}>
                          +{fmt(s.amount)}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden"
                        style={{ background: 'var(--surface-low)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${totalIncome > 0 ? (s.amount / totalIncome) * 100 : 0}%`,
                            background: isActive ? 'var(--dku-blue-primary)' : 'var(--ski-blue-100)',
                          }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 지출 */}
          {summary.filter(s => s.type === 'expense').length > 0 && (
            <div>
              <p className="text-xs font-black mb-3" style={{ color: 'var(--accent-red)' }}>지출</p>
              <div className="flex flex-col gap-3">
                {summary.filter(s => s.type === 'expense').map(s => {
                  const fk = getFilterKey(s)
                  const isActive = filterCode === fk
                  return (
                    <button key={fk} type="button"
                      onClick={() => { setFilterCode(isActive ? null : fk); setTxOpen(true) }}
                      className="w-full text-left">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold flex items-center gap-1.5"
                          style={{ color: isActive ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                          {s.label}
                          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>{s.count}건</span>
                        </span>
                        <span className="font-black" style={{ color: 'var(--accent-red)' }}>
                          -{fmt(Math.abs(s.amount))}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden"
                        style={{ background: 'var(--surface-low)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${totalExpense > 0 ? (Math.abs(s.amount) / totalExpense) * 100 : 0}%`,
                            background: isActive ? 'var(--accent-red)' : 'rgba(220,38,38,0.25)',
                          }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 거래 내역 */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <button
          onClick={() => { setTxOpen(!txOpen); if (txOpen) setFilterCode(null) }}
          className="w-full px-5 py-4 flex items-center justify-between">
          <h2 className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            거래 내역
            <span className="ml-2 font-black" style={{ color: 'var(--text-tertiary)' }}>
              {filteredLabel
                ? `${filteredLabel} · ${filteredTx.length}건`
                : `${transactions.length}건`}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {filterCode && (
              <button type="button"
                onClick={e => { e.stopPropagation(); setFilterCode(null) }}
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-hint)' }}>
                필터 해제
              </button>
            )}
            <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>
              {txOpen ? '접기' : '펼치기'}
            </span>
          </div>
        </button>

        {txOpen && (
          <div style={{ borderTop: '1px solid var(--border-primary)' }}>
            {filteredTx.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-hint)' }}>
                거래 내역이 없어요
              </p>
            ) : (
              filteredTx.map((tx, i) => {
                const code = tx.account_code
                const txType = code ? getTransactionType(code, tx.amount) : null
                const isIncome = txType === 'income'
                return (
                  <div key={tx.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{
                      borderBottom: i !== filteredTx.length - 1
                        ? '1px solid var(--border-primary)' : 'none'
                    }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isIncome ? 'var(--dku-blue)' : 'var(--accent-red)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                        {tx.description}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                        {new Date(tx.traded_at).toLocaleDateString('ko-KR', {
                          month: 'numeric', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {tx.account_label && ` · ${tx.account_label}`}
                      </p>
                    </div>
                    <p className="text-sm font-black flex-shrink-0"
                      style={{ color: isIncome ? 'var(--dku-blue-primary)' : 'var(--accent-red)' }}>
                      {isIncome ? '+' : '-'}{fmt(tx.amount)}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </main>
  )
}