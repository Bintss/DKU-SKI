'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'

type Settlement = {
  id: string
  title: string
  description: string | null
  total_amount: number
  amount_per_person: number
  created_at: string
  due_date: string | null
  created_by: string
  profiles: { name: string } | null
}

type SettlementItem = {
  id: string
  settlement_id: string
  user_id: string
  amount: number
  is_paid: boolean
  status: 'unpaid' | 'pending' | 'paid'
}

export default function SettlementPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [myItems, setMyItems] = useState<SettlementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'history' | 'all'>('active')
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return
    const fetchData = async () => {
      const [{ data: settlementData }, { data: itemData }] = await Promise.all([
        supabase.from('settlements')
          .select('*, profiles(name)')
          .order('created_at', { ascending: false }),
        supabase.from('settlement_items')
          .select('*')
          .eq('user_id', profile.id),
      ])
      setSettlements(settlementData ?? [])
      setMyItems(itemData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [profile])

  const getMyItem = (settlementId: string) =>
    myItems.find(i => i.settlement_id === settlementId)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  // 탭별 필터링
  const activeSettlements = settlements.filter(s => {
    const myItem = getMyItem(s.id)
    // 내가 포함된 정산 중 미납/확인대기
    return myItem && myItem.status !== 'paid'
  })

  const historySettlements = settlements.filter(s => {
    const myItem = getMyItem(s.id)
    // 내가 포함된 정산 중 완료
    return myItem && myItem.status === 'paid'
  })

  const allSettlements = settlements

  const displaySettlements =
    tab === 'active' ? activeSettlements :
    tab === 'history' ? historySettlements :
    allSettlements

  // 미납 요약
  const unpaidItems = myItems.filter(i => i.status === 'unpaid')
  const pendingItems = myItems.filter(i => i.status === 'pending')
  const totalUnpaid = unpaidItems.reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = myItems
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)

  const statusLabel = (status: string) => {
    if (status === 'paid') return '납부완료'
    if (status === 'pending') return '확인 대기'
    return '미납'
  }

  const statusStyle = (status: string) => {
    if (status === 'paid') return {
      bg: 'rgba(46,204,113,0.15)', color: 'var(--accent-green)'
    }
    if (status === 'pending') return {
      bg: 'rgba(255,214,0,0.15)', color: '#FFD700'
    }
    return { bg: 'rgba(240,149,149,0.15)', color: '#F09595' }
  }

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-24 mb-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonList count={3} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Settlement</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>정산</h1>
        </div>
        <a href="/settlement/new"
          className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
          style={{ background: 'var(--ski-blue)' }}>
          + 정산 요청
        </a>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* 미납 */}
        <div className="rounded-2xl p-4"
          style={{
            background: totalUnpaid > 0
              ? 'rgba(240,149,149,0.1)' : 'var(--bg-card)',
            border: `0.5px solid ${totalUnpaid > 0
              ? 'rgba(240,149,149,0.3)' : 'var(--border-primary)'}`,
          }}>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: totalUnpaid > 0 ? 'rgba(240,149,149,0.7)' : 'var(--text-hint)' }}>
            미납
          </p>
          <p className="text-xl font-black"
            style={{ color: totalUnpaid > 0 ? '#F09595' : 'var(--text-tertiary)' }}>
            {totalUnpaid > 0 ? `${totalUnpaid.toLocaleString()}원` : '없음'}
          </p>
          {pendingItems.length > 0 && (
            <p className="text-xs mt-1" style={{ color: '#FFD700' }}>
              확인대기 {pendingItems.length}건
            </p>
          )}
          {unpaidItems.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,149,149,0.6)' }}>
              {unpaidItems.length}건 미납
            </p>
          )}
        </div>

        {/* 완료 */}
        <div className="rounded-2xl p-4"
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-primary)',
          }}>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>납부 완료</p>
          <p className="text-xl font-black"
            style={{ color: totalPaid > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
            {totalPaid > 0 ? `${totalPaid.toLocaleString()}원` : '없음'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-hint)' }}>
            {historySettlements.length}건 완료
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-4 mb-6"
        style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
        {[
          {
            value: 'active',
            label: '진행 중',
            badge: unpaidItems.length + pendingItems.length
          },
          { value: 'history', label: '완료 내역', badge: 0 },
          { value: 'all', label: '전체', badge: 0 },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value as 'active' | 'history' | 'all')}
            className="pb-3 text-sm font-black transition-colors relative flex items-center gap-1.5"
            style={{ color: tab === t.value ? 'var(--text-primary)' : 'var(--text-hint)' }}>
            {t.label}
            {t.badge > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: '#E24B4A' }}>
                {t.badge}
              </span>
            )}
            {tab === t.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--ski-blue)' }} />
            )}
          </button>
        ))}
      </div>

      {/* 정산 목록 */}
      {displaySettlements.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black mb-2"
            style={{ color: 'rgba(255,255,255,0.05)' }}>
            {tab === 'active' ? 'ALL CLEAR' : tab === 'history' ? 'NO HISTORY' : 'EMPTY'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {tab === 'active' ? '미납 정산이 없어요' :
             tab === 'history' ? '완료된 정산 내역이 없어요' :
             '등록된 정산이 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displaySettlements.map(s => {
            const myItem = getMyItem(s.id)
            const isMySettlement = s.created_by === profile?.id
            const ss = myItem ? statusStyle(myItem.status) : null

            return (
              <a key={s.id} href={`/settlement/${s.id}`}
                className="block rounded-2xl p-5 card-hover btn-press"
                style={{
                  background: 'var(--bg-card)',
                  border: `0.5px solid ${myItem && myItem.status === 'unpaid'
                    ? 'rgba(240,149,149,0.3)'
                    : myItem && myItem.status === 'pending'
                    ? 'rgba(255,214,0,0.2)'
                    : 'var(--border-primary)'}`,
                }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isMySettlement && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                        내가 요청
                      </span>
                    )}
                    {myItem && ss && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background: ss.bg, color: ss.color }}>
                        {statusLabel(myItem.status)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-hint)' }}>
                    {formatDate(s.created_at)}
                  </span>
                </div>

                <p className="text-base font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                  {s.title}
                </p>
                {s.description && (
                  <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {s.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    {myItem ? (
                      <p className="text-lg font-black"
                        style={{
                          color: myItem.status === 'paid' ? 'var(--text-tertiary)'
                            : myItem.status === 'pending' ? '#FFD700'
                            : '#F09595'
                        }}>
                        {myItem.amount.toLocaleString()}원
                      </p>
                    ) : (
                      <p className="text-sm font-black" style={{ color: 'var(--text-hint)' }}>
                        1인당 {s.amount_per_person.toLocaleString()}원
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                      총 {s.total_amount.toLocaleString()}원 · {s.profiles?.name}
                    </p>
                  </div>
                  {s.due_date && (
                    <span className="text-xs font-black px-2.5 py-1 rounded-full"
                      style={{
                        background: new Date(s.due_date) < new Date()
                          ? 'rgba(240,149,149,0.15)' : 'rgba(255,255,255,0.06)',
                        color: new Date(s.due_date) < new Date()
                          ? '#F09595' : 'var(--text-hint)',
                      }}>
                      {new Date(s.due_date) < new Date()
                        ? '기한 초과' : `~${s.due_date.slice(5)}`}
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}