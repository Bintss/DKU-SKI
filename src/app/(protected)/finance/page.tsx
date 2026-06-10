'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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
  const [records, setRecords] = useState<Finance[]>([])
  const [season, setSeason] = useState('2026-27')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const [txOpen, setTxOpen] = useState(false)
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

  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + Math.abs(r.amount), 0)
  const balance = totalIncome - totalExpense

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.abs(n)) + '원'

  const categoryExpense = records
    .filter(r => r.type === 'expense')
    .reduce((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + Math.abs(r.amount)
      return acc
    }, {} as Record<string, number>)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">재무 공시</h1>
        <select
          value={season}
          onChange={e => setSeason(e.target.value)}
          className="text-sm border rounded-xl px-3 py-2 outline-none bg-white"
        >
          <option value="2026-27">2026-27</option>
          <option value="2025-26">2025-26</option>
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="rounded-2xl p-5 mb-5 text-white"
        style={{ background: 'linear-gradient(135deg, var(--ski-blue) 0%, var(--ski-blue-light) 100%)' }}
      >
        <p className="text-blue-200 text-xs mb-3">{season} 시즌</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-blue-200 text-xs mb-1">총 수입</p>
            <p className="text-base font-bold">{(totalIncome / 10000).toFixed(0)}만원</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">총 지출</p>
            <p className="text-base font-bold">{(totalExpense / 10000).toFixed(0)}만원</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">잔액</p>
            <p className={`text-base font-bold ${balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {(balance / 10000).toFixed(0)}만원
            </p>
          </div>
        </div>
      </div>

      {/* 항목별 지출 */}
      {Object.keys(categoryExpense).length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-5 border">
          <h2 className="text-sm font-medium text-gray-500 mb-4">항목별 지출</h2>
          <div className="flex flex-col gap-3">
            {Object.entries(categoryExpense)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{cat}</span>
                    <span className="font-medium text-gray-800">{fmt(amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--gray-100)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(amount / totalExpense) * 100}%`,
                        background: 'var(--ski-blue)'
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 거래 내역 */}
<div className="bg-white rounded-2xl border overflow-hidden">
  <button
    onClick={() => setTxOpen(!txOpen)}
    className="w-full px-5 py-4 flex items-center justify-between"
  >
    <h2 className="text-sm font-medium text-gray-500">
      거래 내역
      <span className="text-gray-900 ml-1.5">{records.length}건</span>
    </h2>
    <span className="text-xs text-gray-400">{txOpen ? '접기 ▲' : '펼치기 ▼'}</span>
  </button>

  {txOpen && (
    <>
      {records.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10 border-t">거래 내역이 없어요</p>
      ) : (
        <div className="border-t">
          {records.map((r, i) => (
            <div key={r.id}
              className={`flex items-center gap-3 px-5 py-3.5 ${
                i !== records.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                r.type === 'income' ? 'bg-blue-500' : 'bg-red-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{r.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.date} · {r.category}</p>
              </div>
              <p className={`text-sm font-medium flex-shrink-0 ${
                r.type === 'income' ? 'text-blue-600' : 'text-red-500'
              }`}>
                {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )}
</div>
    </main>
  )
}