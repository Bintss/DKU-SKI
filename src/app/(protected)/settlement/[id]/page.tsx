'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  user_id: string
  amount: number
  is_paid: boolean
  status: 'unpaid' | 'pending' | 'paid'
  paid_at: string | null
  profiles: { name: string; generation: number } | null
}

type ClubAccount = {
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

export default function SettlementDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [items, setItems] = useState<SettlementItem[]>([])
  const [clubAccount, setClubAccount] = useState<ClubAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const fetchData = async () => {
    if (!profile) return
    const [{ data: settlementData }, { data: itemData }, { data: settingsData }] = await Promise.all([
      supabase.from('settlements')
        .select('*, profiles(name)')
        .eq('id', id).single(),
      supabase.from('settlement_items')
        .select('*, profiles(name, generation)')
        .eq('settlement_id', id)
        .order('status'),
      supabase.from('club_settings').select('*').eq('id', 1).single(),
    ])
    setSettlement(settlementData)
    setItems(itemData ?? [])
    setClubAccount(settingsData ?? null)
    setLoading(false)
  }

  useEffect(() => {
  if (!profile) return
  fetchData()

  // Realtime 구독 — 이 정산의 항목 변경 시 자동 재조회
  const channel = supabase
    .channel(`settlement-detail-${id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settlement_items',
      filter: `settlement_id=eq.${id}`,
    }, () => {
      fetchData()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [profile, id])

  const callStatusApi = async (itemId: string, action: string) => {
    setActionLoading(itemId)
    setActionError('')
    try {
      const res = await fetch('/api/settlement/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action }),
      })
      const result = await res.json()
      if (!res.ok) {
        setActionError(result.error ?? '처리에 실패했어요')
        return
      }
      await fetchData()
    } catch {
      setActionError('네트워크 오류가 발생했어요')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정산을 삭제할까요?')) return
    await supabase.from('settlements').delete().eq('id', id as string)
    router.push('/settlement')
  }

  const openToss = (
    accountNumber: string,
    bankName: string,
    amount: number,
    name: string
  ) => {
    const tossDeepLink = `supertoss://send?bank=${encodeURIComponent(bankName)}&accountNo=${accountNumber}&amount=${amount}&origin=${encodeURIComponent(name)}`
    window.location.href = tossDeepLink
    setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      if (isIOS) {
        window.open('https://apps.apple.com/kr/app/toss/id839333328', '_blank')
      } else if (isAndroid) {
        window.open('https://play.google.com/store/apps/details?id=viva.republica.toss', '_blank')
      } else {
        window.open('https://toss.im', '_blank')
      }
    }, 1500)
  }

  const copyAccount = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber)
      alert('계좌번호가 복사됐어요')
    } catch {
      alert(accountNumber)
    }
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!settlement) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>정산을 찾을 수 없어요</p>
    </div>
  )

  const myItem = items.find(i => i.user_id === profile?.id)
  const isCreator = settlement.created_by === profile?.id
  const isAdmin = profile?.role === 'admin'
  const canConfirm = isCreator || isAdmin
  const paidCount = items.filter(i => i.status === 'paid').length
  const pendingCount = items.filter(i => i.status === 'pending').length
  const totalCount = items.length
  const collectedAmount = items.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pendingAmount = items.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const remainingAmount = settlement.total_amount - collectedAmount
  const progressPct = totalCount > 0 ? (paidCount / totalCount) * 100 : 0

  const statusLabel = (status: string) => {
    if (status === 'paid') return '납부완료'
    if (status === 'pending') return '확인 대기'
    return '미납'
  }

  const statusStyle = (status: string) => {
    if (status === 'paid') return { bg: 'rgba(46,204,113,0.2)', color: 'var(--accent-green)' }
    if (status === 'pending') return { bg: 'rgba(255,214,0,0.15)', color: '#FFD700' }
    return { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/settlement" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 정산 목록</Link>
        {canConfirm && (
          <button onClick={handleDelete}
            className="text-xs font-black" style={{ color: '#FF6B6B' }}>
            삭제
          </button>
        )}
      </div>

      {/* 정산 헤더 카드 — 요청자 관점 요약 포함 */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%,-30%)' }} />
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'rgba(255,255,255,0.5)' }}>
          {settlement.profiles?.name} 요청
        </p>
        <h1 className="text-xl font-black mb-1" style={{ color: '#fff' }}>
          {settlement.title}
        </h1>
        {settlement.description && (
          <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {settlement.description}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>수금 완료</p>
            <p className="text-base font-black" style={{ color: '#fff' }}>
              {collectedAmount.toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>확인 대기</p>
            <p className="text-base font-black" style={{ color: '#FFD700' }}>
              {pendingAmount.toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>남은 금액</p>
            <p className="text-base font-black" style={{ color: '#FFB4B4' }}>
              {remainingAmount.toLocaleString()}원
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full flex">
            <div className="h-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: 'rgba(255,255,255,0.7)',
                borderRadius: pendingCount > 0 ? '9999px 0 0 9999px' : '9999px',
              }} />
            <div className="h-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%`,
                background: 'rgba(255,214,0,0.6)',
                borderRadius: '0 9999px 9999px 0',
              }} />
          </div>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {paidCount}/{totalCount}명 완료 · 총 {settlement.total_amount.toLocaleString()}원
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl px-4 py-3 mb-4"
          style={{ background: 'rgba(240,149,149,0.1)', border: '0.5px solid rgba(240,149,149,0.3)' }}>
          <p className="text-xs font-bold" style={{ color: '#F09595' }}>{actionError}</p>
        </div>
      )}

      {/* 내 정산 카드 */}
      {myItem && (
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: myItem.status === 'paid'
              ? 'rgba(46,204,113,0.1)'
              : myItem.status === 'pending'
              ? 'rgba(255,214,0,0.08)'
              : 'rgba(240,149,149,0.1)',
            border: `0.5px solid ${myItem.status === 'paid'
              ? 'rgba(46,204,113,0.3)'
              : myItem.status === 'pending'
              ? 'rgba(255,214,0,0.3)'
              : 'rgba(240,149,149,0.3)'}`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black tracking-widest uppercase"
              style={{
                color: myItem.status === 'paid' ? 'rgba(46,204,113,0.7)'
                  : myItem.status === 'pending' ? 'rgba(255,214,0,0.7)'
                  : 'rgba(240,149,149,0.7)'
              }}>
              내 정산
            </p>
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={statusStyle(myItem.status)}>
              {statusLabel(myItem.status)}
            </span>
          </div>

          <p className="text-3xl font-black mb-3"
            style={{
              color: myItem.status === 'paid' ? 'var(--accent-green)'
                : myItem.status === 'pending' ? '#FFD700'
                : '#F09595'
            }}>
            {myItem.amount.toLocaleString()}원
          </p>

          {settlement.due_date && myItem.status === 'unpaid' && (
            <p className="text-xs mb-3" style={{ color: 'rgba(240,149,149,0.7)' }}>
              마감일: {settlement.due_date}
            </p>
          )}

          {/* unpaid 상태 */}
          {myItem.status === 'unpaid' && (
            <div className="flex flex-col gap-2">
              {clubAccount?.account_number && (
                <div className="rounded-xl p-3 mb-1"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                  }}>
                  <p className="text-xs font-black mb-1" style={{ color: 'var(--text-hint)' }}>
                    스키부 입금 계좌
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {clubAccount.bank_name} {clubAccount.account_number}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {clubAccount.account_holder}
                  </p>
                </div>
              )}

              {clubAccount?.account_number && (
                <button
                  type="button"
                  onClick={() => openToss(
                    clubAccount.account_number!,
                    clubAccount.bank_name ?? '',
                    myItem.amount,
                    clubAccount.account_holder ?? '단국대학교 스키부',
                  )}
                  className="w-full py-3 rounded-xl text-sm font-black"
                  style={{ background: '#3182F6', color: '#fff' }}>
                  간편 송금하기
                </button>
              )}

              {clubAccount?.account_number && (
                <button
                  type="button"
                  onClick={() => copyAccount(clubAccount.account_number!)}
                  className="w-full py-2.5 rounded-xl text-xs font-black"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-tertiary)',
                    border: '0.5px solid var(--border-primary)',
                  }}>
                  계좌번호 복사
                </button>
              )}

              <button
                type="button"
                disabled={actionLoading === myItem.id}
                onClick={() => callStatusApi(myItem.id, 'request_confirm')}
                className="w-full py-2.5 rounded-xl text-xs font-black"
                style={{
                  background: 'rgba(255,214,0,0.1)',
                  color: '#FFD700',
                  border: '0.5px solid rgba(255,214,0,0.3)',
                  opacity: actionLoading === myItem.id ? 0.5 : 1,
                }}>
                {actionLoading === myItem.id ? '처리 중...' : '송금했어요 (확인 요청)'}
              </button>

              {!clubAccount?.account_number && (
                <p className="text-xs text-center mt-1" style={{ color: 'var(--text-hint)' }}>
                  운영진이 아직 계좌를 등록하지 않았어요.
                </p>
              )}
            </div>
          )}

          {/* pending 상태 */}
          {myItem.status === 'pending' && (
            <div className="rounded-xl p-4 text-center"
              style={{
                background: 'rgba(255,214,0,0.08)',
                border: '0.5px solid rgba(255,214,0,0.2)',
              }}>
              <p className="text-xs font-black mb-1" style={{ color: '#FFD700' }}>
                송금 확인 요청 완료
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-hint)' }}>
                운영진이 확인 후 납부 완료 처리해요
              </p>
              <button
                type="button"
                disabled={actionLoading === myItem.id}
                onClick={() => callStatusApi(myItem.id, 'cancel_pending')}
                className="text-xs font-black px-4 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-tertiary)',
                  border: '0.5px solid var(--border-primary)',
                  opacity: actionLoading === myItem.id ? 0.5 : 1,
                }}>
                {actionLoading === myItem.id ? '처리 중...' : '취소'}
              </button>
            </div>
          )}

          {/* paid 상태 */}
          {myItem.status === 'paid' && (
            <div className="rounded-xl p-3 text-center"
              style={{
                background: 'rgba(46,204,113,0.1)',
                border: '0.5px solid rgba(46,204,113,0.2)',
              }}>
              <p className="text-sm font-black mb-0.5" style={{ color: 'var(--accent-green)' }}>
                납부 완료
              </p>
              {myItem.paid_at && (
                <p className="text-xs" style={{ color: 'rgba(46,204,113,0.6)' }}>
                  {new Date(myItem.paid_at).toLocaleDateString('ko-KR', {
                    month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })} 확인 완료
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 전체 현황 — 요청자/운영진만 모든 항목을, 일반 부원은 본인만 보도록 권장하지만
          현재 RLS 구조상 전체 조회가 되어 있다면 추후 RLS 강화 필요 (다음 단계에서 처리) */}
      {canConfirm && (
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-hint)' }}>
            전체 현황
            <span className="ml-2 font-black" style={{ color: 'var(--text-tertiary)' }}>
              {paidCount}/{totalCount}
            </span>
            {pendingCount > 0 && (
              <span className="ml-1 font-black" style={{ color: '#FFD700' }}>
                · {pendingCount}명 확인대기
              </span>
            )}
          </h2>

          <div className="flex flex-col gap-2">
            {items.map(item => {
              const sc = statusStyle(item.status)
              return (
                <div key={item.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{
                      background: item.user_id === profile?.id
                        ? 'var(--accent-green)'
                        : item.status === 'paid' ? 'rgba(46,204,113,0.3)'
                        : item.status === 'pending' ? 'rgba(255,214,0,0.3)'
                        : 'var(--ski-blue)',
                    }}>
                    {item.profiles?.name?.[0] ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {item.profiles?.name}
                      </span>
                      {item.user_id === profile?.id && (
                        <span className="text-xs font-black"
                          style={{ color: 'var(--accent-green)' }}>나</span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                        {item.profiles?.generation}기
                      </span>
                    </div>
                    <span className="text-xs font-black"
                      style={{
                        color: item.status === 'paid' ? 'var(--accent-green)'
                          : item.status === 'pending' ? '#FFD700'
                          : '#F09595'
                      }}>
                      {item.amount.toLocaleString()}원
                    </span>
                  </div>

                  {item.status === 'paid' ? (
                    <button
                      type="button"
                      disabled={actionLoading === item.id}
                      onClick={() => {
                        if (!confirm('납부완료를 취소하고 미납으로 되돌릴까요?')) return
                        callStatusApi(item.id, 'revert_unpaid')
                      }}
                      className="text-xs font-black px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      style={{
                        background: sc.bg,
                        color: sc.color,
                        border: `0.5px solid ${sc.color}40`,
                        opacity: actionLoading === item.id ? 0.5 : 1,
                      }}>
                      {actionLoading === item.id ? '...' : statusLabel(item.status)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading === item.id}
                      onClick={() => callStatusApi(item.id, 'mark_paid')}
                      className="text-xs font-black px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      style={{
                        background: sc.bg,
                        color: sc.color,
                        border: `0.5px solid ${sc.color}40`,
                        opacity: actionLoading === item.id ? 0.5 : 1,
                      }}>
                      {actionLoading === item.id ? '...' : statusLabel(item.status)}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 일반 부원에게는 전체 명단 대신 요약만 */}
      {!canConfirm && (
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>전체 진행 현황</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {paidCount}/{totalCount}명 납부 완료
          </p>
        </div>
      )}
    </main>
  )
}