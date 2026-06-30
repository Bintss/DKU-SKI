'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

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
  const [manageMode, setManageMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!profile) return
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
  }, [profile, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime — 다른 사람의 정산 상태 변경을 즉시 반영
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('settlement-list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlement_items', filter: `user_id=eq.${profile.id}` }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, fetchData, supabase])

  // 탭 복귀 시 보완 갱신
  usePageVisibilityRefetch(fetchData, { enabled: !!profile, debounceMs: 2000 })

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

  const activeSettlements = settlements.filter(s => {
    const myItem = getMyItem(s.id)
    return myItem && myItem.status !== 'paid'
  })

  const historySettlements = settlements.filter(s => {
    const myItem = getMyItem(s.id)
    return myItem && myItem.status === 'paid'
  })

  const allSettlements = settlements

  const displaySettlements =
    tab === 'active' ? activeSettlements :
    tab === 'history' ? historySettlements :
    allSettlements

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 정산 ${selectedIds.length}건을 삭제할까요? 관련된 정산 항목도 모두 삭제돼요.`)) return

    setDeleting(true)
    const res = await fetch('/api/settlement/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementIds: selectedIds }),
    })
    const result = await res.json()
    setDeleting(false)

    if (!res.ok) {
      alert(result.error ?? '삭제에 실패했어요')
      return
    }

    setSelectedIds([])
    setManageMode(false)
    fetchData()
  }

  const handleDeleteAll = async () => {
    if (!confirm('모든 정산 내역을 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return
    if (!confirm('정말로 전체 삭제하시겠어요? 한 번 더 확인할게요.')) return

    setDeleting(true)
    const res = await fetch('/api/settlement/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteAll: true }),
    })
    const result = await res.json()
    setDeleting(false)

    if (!res.ok) {
      alert(result.error ?? '삭제에 실패했어요')
      return
    }

    setSelectedIds([])
    setManageMode(false)
    fetchData()
  }

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-24 mb-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonList count={3} />
    </main>
  )

  const isAdmin = profile?.role === 'admin'

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Settlement</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>정산</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => {
                setManageMode(!manageMode)
                setSelectedIds([])
              }}
              className="text-xs font-black px-3 py-2 rounded-xl btn-press"
              style={{
                background: manageMode ? 'rgba(255,255,255,0.1)' : 'var(--bg-card)',
                border: '0.5px solid var(--border-primary)',
                color: manageMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}>
              {manageMode ? '완료' : '관리'}
            </button>
          )}
          {!manageMode && (
            <Link href="/settlement/new"
              className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
              style={{ background: 'var(--ski-blue)' }}>
              + 정산 요청
            </Link>
          )}
        </div>
      </div>

      {/* 관리 모드 액션 바 */}
      {manageMode && (
        <div className="rounded-2xl p-4 mb-5 flex items-center justify-between"
          style={{ background: 'rgba(240,149,149,0.08)', border: '0.5px solid rgba(240,149,149,0.25)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
            {selectedIds.length}건 선택됨
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || deleting}
              className="text-xs font-black px-3 py-1.5 rounded-lg disabled:opacity-40 btn-press"
              style={{ background: 'rgba(240,149,149,0.2)', color: '#F09595' }}>
              선택 삭제
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="text-xs font-black px-3 py-1.5 rounded-lg disabled:opacity-40 btn-press"
              style={{ background: '#E24B4A', color: '#fff' }}>
              전체 삭제
            </button>
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      {!manageMode && (
        <div className="grid grid-cols-2 gap-3 mb-5">
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
      )}

      {/* 탭 */}
      {!manageMode && (
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
      )}

      {/* 정산 목록 — 관리 모드일 땐 전체(all) 기준으로 보여줌 */}
      {(manageMode ? allSettlements : displaySettlements).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black mb-2"
            style={{ color: 'rgba(255,255,255,0.05)' }}>
            {manageMode ? 'EMPTY' : tab === 'active' ? 'ALL CLEAR' : tab === 'history' ? 'NO HISTORY' : 'EMPTY'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {manageMode ? '삭제할 정산이 없어요' :
             tab === 'active' ? '미납 정산이 없어요' :
             tab === 'history' ? '완료된 정산 내역이 없어요' :
             '등록된 정산이 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(manageMode ? allSettlements : displaySettlements).map(s => {
            const myItem = getMyItem(s.id)
            const isMySettlement = s.created_by === profile?.id
            const ss = myItem ? statusStyle(myItem.status) : null
            const isSelected = selectedIds.includes(s.id)

            if (manageMode) {
              return (
                <div key={s.id}
                  onClick={() => toggleSelect(s.id)}
                  className="rounded-2xl p-5 cursor-pointer btn-press"
                  style={{
                    background: isSelected ? 'rgba(240,149,149,0.1)' : 'var(--bg-card)',
                    border: `0.5px solid ${isSelected ? 'rgba(240,149,149,0.4)' : 'var(--border-primary)'}`,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: isSelected ? '#E24B4A' : 'rgba(255,255,255,0.06)',
                        border: `0.5px solid ${isSelected ? '#E24B4A' : 'var(--border-primary)'}`,
                      }}>
                      {isSelected && <span className="text-white text-xs font-black">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                        {s.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                        {s.profiles?.name} · {formatDate(s.created_at)} · 총 {s.total_amount.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link key={s.id} href={`/settlement/${s.id}`}
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
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}