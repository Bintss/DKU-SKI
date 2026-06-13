'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'

type Finance = {
  id: string
  season: string
  date: string
  category: string
  description: string
  amount: number
  type: string
}

export default function FinancePage() {
  const { loading: profileLoading } = useProfile()
  const [records, setRecords] = useState<Finance[]>([])
  const [season, setSeason] = useState('2026-27')
  const [loading, setLoading] = useState(true)
  const [txOpen, setTxOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchFinance = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('finance')
        .select('*')
        .eq('season', season)
        .order('date', { ascending: false })
      setRecords(data ?? [])
      setLoading(false)
    }
    fetchFinance()
  }, [season])

  const totalIncome = records.filter(r => r.type === 'income')
    .reduce((s, r) => s + r.amount, 0)
  const totalExpense = records.filter(r => r.type === 'expense')
    .reduce((s, r) => s + Math.abs(r.amount), 0)
  const balance = totalIncome - totalExpense

  const fmt = (n: number) =>
    new Intl.NumberFormat('ko-KR').format(Math.abs(n)) + '원'

  const categoryExpense = records
    .filter(r => r.type === 'expense')
    .reduce((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + Math.abs(r.amount)
      return acc
    }, {} as Record<string, number>)

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Finance</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>재무 공시</h1>
        </div>
        <select value={season} onChange={e => setSeason(e.target.value)}
          className="text-xs font-bold rounded-xl px-3 py-2"
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-primary)',
            color: 'var(--text-secondary)',
          }}>
          <option value="2026-27">2026-27</option>
          <option value="2025-26">2025-26</option>
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%,-30%)' }} />
        <p className="text-xs font-black tracking-widest uppercase mb-4"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          {season} 시즌
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>수입</p>
            <p className="text-lg font-black text-white">
              {(totalIncome / 10000).toFixed(0)}만
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>지출</p>
            <p className="text-lg font-black" style={{ color: '#F09595' }}>
              {(totalExpense / 10000).toFixed(0)}만
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>잔액</p>
            <p className="text-lg font-black"
              style={{ color: balance >= 0 ? '#2ECC71' : '#F09595' }}>
              {(balance / 10000).toFixed(0)}만
            </p>
          </div>
        </div>
        <div className="mt-4 h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full rounded-full"
            style={{
              width: `${Math.min((totalExpense / totalIncome) * 100 || 0, 100)}%`,
              background: 'rgba(255,255,255,0.6)',
            }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          예산 집행률 {Math.round((totalExpense / totalIncome) * 100) || 0}%
        </p>
      </div>

      {/* 항목별 지출 */}
      {Object.keys(categoryExpense).length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-hint)' }}>항목별 지출</h2>
          <div className="flex flex-col gap-4">
            {Object.entries(categoryExpense)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {cat}
                    </span>
                    <span className="font-black" style={{ color: 'var(--text-primary)' }}>
                      {fmt(amount)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${(amount / totalExpense) * 100}%`,
                        background: 'var(--ski-blue)',
                      }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 거래 내역 토글 */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <button onClick={() => setTxOpen(!txOpen)}
          className="w-full px-5 py-4 flex items-center justify-between">
          <h2 className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            거래 내역
            <span className="ml-2 font-black" style={{ color: 'var(--text-tertiary)' }}>
              {records.length}건
            </span>
          </h2>
          <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>
            {txOpen ? '접기' : '펼치기'}
          </span>
        </button>

        {txOpen && (
          <div style={{ borderTop: '0.5px solid var(--border-primary)' }}>
            {records.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-hint)' }}>
                거래 내역이 없어요
              </p>
            ) : (
              records.map((r, i) => (
                <div key={r.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{
                    borderBottom: i !== records.length - 1
                      ? '0.5px solid var(--border-primary)' : 'none'
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: r.type === 'income' ? 'var(--accent-blue)' : '#F09595' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                      {r.description}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                      {r.date} · {r.category}
                    </p>
                  </div>
                  <p className="text-sm font-black flex-shrink-0"
                    style={{ color: r.type === 'income' ? 'var(--accent-blue)' : '#F09595' }}>
                    {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}