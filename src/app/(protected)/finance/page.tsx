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

  useEffect(() => {
    const fetchFinance = async () => {
  setLoading(true)

  const { data: { user } } = await supabase.auth.getUser()
  console.log('현재 유저:', user)

  const { data, error } = await supabase
    .from('finance')
    .select('*')
    .eq('season', '2026-27')
    .order('date', { ascending: false })

  console.log('data:', data)
  console.log('error:', error)
  setRecords(data ?? [])
  setLoading(false)
}
    fetchFinance()
  }, [season])

  const totalIncome = records
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)

  const totalExpense = records
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + Math.abs(r.amount), 0)

  const balance = totalIncome - totalExpense

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('ko-KR').format(Math.abs(n)) + '원'

  const categoryExpense = records
    .filter(r => r.type === 'expense')
    .reduce((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + Math.abs(r.amount)
      return acc
    }, {} as Record<string, number>)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">재무 공시</h1>
          <p className="text-xs text-gray-400 mt-0.5">구글 시트 자동 연동</p>
        </div>
        <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 outline-none"
        >   
          <option value="2026-27">2026-27 시즌</option>
          <option value="2025-26">2025-26 시즌</option>
        </select>
      </div>

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl px-4 py-4">
          <p className="text-xs text-gray-400 mb-1">총 수입</p>
          <p className="text-base font-semibold text-blue-600">{formatAmount(totalIncome)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-4">
          <p className="text-xs text-gray-400 mb-1">총 지출</p>
          <p className="text-base font-semibold text-red-500">{formatAmount(totalExpense)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-4">
          <p className="text-xs text-gray-400 mb-1">잔액</p>
          <p className={`text-base font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatAmount(balance)}
          </p>
        </div>
      </div>

      {/* 항목별 지출 */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">항목별 지출</h2>
        <div className="flex flex-col gap-2">
          {Object.entries(categoryExpense).map(([cat, amount]) => (
            <div key={cat}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{cat}</span>
                <span className="font-medium">{formatAmount(amount)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(amount / totalExpense) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 거래 내역 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">거래 내역</h2>
        <div className="border rounded-xl overflow-hidden">
          {records.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 px-4 py-3 ${i !== records.length - 1 ? 'border-b' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.type === 'income' ? 'bg-blue-500' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{r.description}</p>
                <p className="text-xs text-gray-400">{r.date} · {r.category}</p>
              </div>
              <p className={`text-sm font-medium flex-shrink-0 ${r.type === 'income' ? 'text-blue-600' : 'text-red-500'}`}>
                {r.type === 'income' ? '+' : '-'}{formatAmount(r.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 홈으로 */}
      <a href="/home" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-8">
        ← 홈으로
      </a>
    </main>
  )
}