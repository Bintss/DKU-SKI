'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Settlement = {
  id: string
  title: string
  description: string | null
  total_amount: number
  amount_per_person: number
  due_date: string | null
  created_by: string
  created_at: string
  event_id: string | null
  transfer_label: string | null
  profiles: { name: string } | null
}

type SettlementItem = {
  id: string
  user_id: string
  amount: number
  status: 'unpaid' | 'pending' | 'paid'
  is_paid: boolean
  paid_at: string | null
  transfer_name: string | null
  reject_reason: string | null
  profiles: { name: string; generation: number } | null
}

type ClubAccount = {
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

const STATUS_LABEL: Record<string, string> = {
  unpaid: '미납',
  pending: '입금 확인 중',
  paid: '납부완료',
}

const STATUS_COLOR: Record<string, string> = {
  unpaid: 'var(--accent-red)',
  pending: 'var(--accent-yellow)',
  paid: 'var(--accent-green)',
}

const REJECT_REASONS = [
  { value: 'wrong_transfer_name', label: '송금명 오류' },
  { value: 'amount_mismatch', label: '금액 불일치' },
  { value: 'other', label: '기타' },
]

export default function SettlementDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [items, setItems] = useState<SettlementItem[]>([])
  const [clubAccount, setClubAccount] = useState<ClubAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('wrong_transfer_name')

  const fetchData = useCallback(async () => {
    if (!profile) return
    const [{ data: settlementData }, { data: itemData }, { data: settingsData }] = await Promise.all([
      supabase.from('settlements').select('*, profiles(name)').eq('id', id).single(),
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
  }, [profile, id, supabase])

  useEffect(() => {
    if (!profile) return
    fetchData()
    const channel = supabase
      .channel(`settlement-detail-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'settlement_items',
        filter: `settlement_id=eq.${id}`,
      }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, id, fetchData, supabase])

  usePageVisibilityRefetch(fetchData, { enabled: !!profile, debounceMs: 2000 })

  const callStatusApi = async (itemId: string, action: string) => {
    const res = await fetch('/api/settlement/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action }),
    })
    if (res.ok) fetchData()
  }

  const handleReject = async (item: SettlementItem) => {
    if (!rejectReason) return

    const res = await fetch('/api/settlement/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: item.id,
        action: 'reject',
        rejectReason,
      }),
    })
    if (!res.ok) {
      const result = await res.json()
      alert(result.error ?? '반려 처리에 실패했어요')
      return
    }

    // 송금명 오류: "송금명오류환급" 복사 + 토스 딥링크
    // 금액 불일치: "금액불일치환급" 복사 + 토스 딥링크
    const clipboardText = rejectReason === 'wrong_transfer_name'
      ? '송금명불일치'
      : rejectReason === 'amount_mismatch'
      ? '금액불일치환급'
      : null

    if (clipboardText) {
      await navigator.clipboard.writeText(clipboardText).catch(() => {})
    }

    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('name, refund_bank_name, refund_account_number, refund_account_holder')
      .eq('id', item.user_id)
      .single()

    if (memberProfile?.refund_account_number) {
      // 환불 금액: 실제 입금액 (amount_mismatch의 경우 다를 수 있으나
      // 현재는 item.amount 기준으로 환불 — 추후 actualAmount 파라미터로 개선 가능)
      const tossUrl = `supertoss://send?amount=${item.amount}&bank=${encodeURIComponent(memberProfile.refund_bank_name ?? '')}&accountNo=${memberProfile.refund_account_number}&origin=qr`
      window.location.href = tossUrl
      setTimeout(() => { window.open('https://toss.me/transfer', '_blank') }, 500)
    } else {
      alert(`${memberProfile?.name ?? '해당 부원'}의 환급 계좌가 등록되어 있지 않아요.\n직접 환불 후 처리해주세요.`)
    }

    setRejectingId(null)
    setRejectReason('wrong_transfer_name')
    fetchData()
  }

  const handleDelete = async () => {
    if (!confirm('이 정산을 삭제할까요? 되돌릴 수 없어요.')) return
    await supabase.from('settlement_items').delete().eq('settlement_id', id)
    await supabase.from('settlements').delete().eq('id', id)
    router.push('/settlement')
  }

  const isAdmin = profile?.role === 'admin'
  const isCreator = settlement?.created_by === profile?.id
  const myItem = items.find(item => item.user_id === profile?.id)
  const paidCount = items.filter(i => i.status === 'paid').length
  const pendingCount = items.filter(i => i.status === 'pending').length
  const unpaidCount = items.filter(i => i.status === 'unpaid').length

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
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

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/settlement" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 정산</Link>
        {(isAdmin || isCreator) && (
          <button onClick={handleDelete}
            className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--accent-red)' }}>
            삭제
          </button>
        )}
      </div>

      {/* 정산 헤더 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <h1 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          {settlement.title}
        </h1>
        {settlement.description && (
          <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {settlement.description}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {settlement.profiles?.name} · {formatDate(settlement.created_at)}
          </span>
          {settlement.due_date && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
              {formatDate(settlement.due_date)} 마감
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4"
          style={{ borderTop: '1px solid var(--border-primary)' }}>
          {[
            { label: '납부완료', count: paidCount, color: 'var(--accent-green)' },
            { label: '확인 중', count: pendingCount, color: 'var(--accent-yellow)' },
            { label: '미납', count: unpaidCount, color: 'var(--accent-red)' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-xl font-black" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 내 정산 카드 */}
      {myItem && (
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: myItem.status === 'paid' ? 'rgba(22,163,74,0.06)'
              : myItem.status === 'pending' ? 'rgba(202,138,10,0.06)'
              : 'rgba(0,60,117,0.06)',
            border: `1px solid ${
              myItem.status === 'paid' ? 'rgba(22,163,74,0.2)'
              : myItem.status === 'pending' ? 'rgba(202,138,10,0.2)'
              : 'var(--dku-blue-light)'}`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--text-hint)' }}>내 정산</h2>
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{
                background: `${STATUS_COLOR[myItem.status]}22`,
                color: STATUS_COLOR[myItem.status],
              }}>
              {STATUS_LABEL[myItem.status]}
              {myItem.status === 'unpaid' && myItem.reject_reason && ' (반려됨)'}
            </span>
          </div>

          <p className="text-2xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
            {myItem.amount.toLocaleString()}원
          </p>

          {/* 반려 사유 */}
          {myItem.status === 'unpaid' && myItem.reject_reason && (
            <div className="rounded-xl p-3 mb-3"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>
                ⚠️ 반려됨 — {REJECT_REASONS.find(r => r.value === myItem.reject_reason)?.label ?? myItem.reject_reason}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                {myItem.reject_reason === 'wrong_transfer_name'
                  ? '아래 송금명을 확인하고 다시 송금해주세요'
                  : myItem.reject_reason === 'amount_mismatch'
                  ? '정확한 금액으로 다시 송금해주세요'
                  : '운영진에게 문의해주세요'}
              </p>
            </div>
          )}

          {/* 송금명 안내 */}
          {myItem.transfer_name && myItem.status === 'unpaid' && (
            <div className="rounded-xl p-3 mb-3"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)' }}>
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-hint)' }}>
                아래 송금명으로 정확히 보내주세요
              </p>
              <div className="flex items-center gap-2">
                <p className="text-base font-black flex-1" style={{ color: 'var(--text-primary)' }}>
                  {myItem.transfer_name}
                </p>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(myItem.transfer_name!)
                    alert('송금명이 복사됐어요')
                  }}
                  className="text-xs font-black px-3 py-1.5 rounded-lg btn-press flex-shrink-0"
                  style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                  복사
                </button>
              </div>
            </div>
          )}

          {/* 송금 안내 */}
          {myItem.status === 'unpaid' && clubAccount?.account_number && (
            <div className="flex flex-col gap-2 mb-2">
              <button
                onClick={() => {
                  if (myItem.transfer_name) {
                    navigator.clipboard.writeText(myItem.transfer_name).catch(() => {})
                  }
                  const tossUrl = `supertoss://send?amount=${myItem.amount}&bank=${encodeURIComponent(clubAccount.bank_name ?? '')}&accountNo=${clubAccount.account_number}&origin=qr`
                  window.location.href = tossUrl
                  setTimeout(() => { window.open('https://toss.me/transfer', '_blank') }, 500)
                }}
                className="w-full rounded-xl py-3 text-sm font-black btn-press"
                style={{ background: '#FEE500', color: '#3A1D1D' }}>
                {myItem.transfer_name ? '송금명 복사 + 토스로 송금' : '토스로 간편 송금'}
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(clubAccount.account_number ?? '')
                  alert('계좌번호가 복사됐어요')
                }}
                className="w-full rounded-xl py-2.5 text-xs font-bold btn-press"
                style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
                계좌번호 복사 ({clubAccount.bank_name} {clubAccount.account_number})
              </button>
            </div>
          )}

          {/* 상태별 안내 */}
          {myItem.status === 'pending' && (
            <div className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(202,138,10,0.08)', border: '1px solid rgba(202,138,10,0.2)' }}>
              <p className="text-xs font-black mb-0.5" style={{ color: 'var(--accent-yellow)' }}>
                입금 확인 중
              </p>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                입금이 감지됐어요. 금액 확인 후 자동으로 처리돼요.
              </p>
            </div>
          )}

          {myItem.status === 'paid' && (
            <div className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <p className="text-sm font-black mb-0.5" style={{ color: 'var(--accent-green)' }}>
                납부 완료 ✓
              </p>
              {myItem.paid_at && (
                <p className="text-xs" style={{ color: 'rgba(22,163,74,0.6)' }}>
                  {formatDate(myItem.paid_at)} 확인 완료
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 운영진 전체 현황 */}
      {(isAdmin || isCreator) && (
        <div className="rounded-2xl p-5"
          style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-hint)' }}>전체 현황</h2>

          <div className="flex flex-col gap-2">
            {items.map(item => {
              const isRejecting = rejectingId === item.id
              return (
                <div key={item.id} className="rounded-xl p-3"
                  style={{
                    background: 'var(--surface-low)',
                    border: `1px solid ${
                      item.status === 'paid' ? 'rgba(22,163,74,0.2)'
                      : item.status === 'pending' ? 'rgba(202,138,10,0.2)'
                      : item.reject_reason ? 'rgba(220,38,38,0.2)'
                      : 'var(--border-primary)'}`,
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.profiles?.name}
                        </p>
                        <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                          {item.profiles?.generation}기
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold"
                          style={{
                            color: item.status === 'paid' ? 'var(--accent-green)'
                              : item.status === 'pending' ? 'var(--accent-yellow)'
                              : item.reject_reason ? 'var(--accent-red)'
                              : 'var(--accent-red)'
                          }}>
                          {STATUS_LABEL[item.status]}
                          {item.status === 'unpaid' && item.reject_reason && ' (반려됨)'}
                        </span>
                        {item.transfer_name && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                            {item.transfer_name}
                          </span>
                        )}
                        {item.reject_reason && (
                          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                            {REJECT_REASONS.find(r => r.value === item.reject_reason)?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                        {item.amount.toLocaleString()}원
                      </p>
                      {item.status === 'pending' && (
  <div className="flex gap-1">
    <button onClick={() => callStatusApi(item.id, 'mark_paid')}
      className="text-xs font-black px-2 py-1 rounded-lg btn-press"
      style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--accent-green)' }}>
      확인
    </button>
    <button onClick={() => {
      setRejectingId(isRejecting ? null : item.id)
      setRejectReason('wrong_transfer_name')
    }}
      className="text-xs font-black px-2 py-1 rounded-lg btn-press"
      style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--accent-red)' }}>
      반려
    </button>
  </div>
)}

{/* unpaid 항목에 운영진 전용 입금 확인 버튼 */}
{item.status === 'unpaid' && (isAdmin || isCreator) && (
  <button onClick={() => callStatusApi(item.id, 'confirm_deposit')}
    className="text-xs font-black px-2 py-1 rounded-lg btn-press"
    style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
    입금 확인
  </button>
)}

{item.status === 'paid' && (
  <button onClick={() => {
    if (confirm('납부 확인을 취소할까요?')) callStatusApi(item.id, 'revert_unpaid')
  }}
    className="text-xs font-bold px-2 py-1 rounded-lg btn-press"
    style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-hint)' }}>
    되돌리기
  </button>
)}
                    </div>
                  </div>

                  {/* 반려 처리 패널 */}
                  {isRejecting && (
                    <div className="mt-3 pt-3 flex flex-col gap-2"
                      style={{ borderTop: '1px solid var(--border-primary)' }}>
                      <p className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                        반려 사유
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {REJECT_REASONS.map(r => (
                          <button key={r.value} type="button"
                            onClick={() => setRejectReason(r.value)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold btn-press"
                            style={{
                              background: rejectReason === r.value
                                ? 'rgba(220,38,38,0.1)' : '#fff',
                              border: `1px solid ${rejectReason === r.value
                                ? 'rgba(220,38,38,0.3)' : 'var(--border-primary)'}`,
                              color: rejectReason === r.value ? 'var(--accent-red)' : 'var(--text-tertiary)',
                            }}>
                            {r.label}
                          </button>
                        ))}
                      </div>

                      <RefundAccountPreview userId={item.user_id} supabase={supabase} />

                      <button onClick={() => handleReject(item)}
                        className="w-full rounded-xl py-2.5 text-xs font-black btn-press"
                        style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--accent-red)' }}>
                        {rejectReason === 'wrong_transfer_name'
                          ? '반려 처리 + "송금명불일치" 복사 + 환불 송금'
                          : rejectReason === 'amount_mismatch'
                          ? '반려 처리 + "금액불일치환급" 복사 + 환불 송금'
                          : '반려 처리'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}

function RefundAccountPreview({
  userId,
  supabase,
}: {
  userId: string
  supabase: ReturnType<typeof createClient>
}) {
  const [account, setAccount] = useState<{
    name: string | null
    refund_bank_name: string | null
    refund_account_number: string | null
    refund_account_holder: string | null
  } | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('name, refund_bank_name, refund_account_number, refund_account_holder')
      .eq('id', userId)
      .single()
      .then(({ data }) => setAccount(data))
  }, [userId, supabase])

  if (!account) return null

  return account.refund_account_number ? (
    <div className="rounded-xl p-3"
      style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)' }}>
      <p className="text-xs font-black mb-1.5" style={{ color: 'var(--text-hint)' }}>
        환불 계좌
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {account.refund_bank_name} {account.refund_account_number}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {account.refund_account_holder}
          </p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(account.refund_account_number!)
            alert('계좌번호가 복사됐어요')
          }}
          className="text-xs font-black px-2.5 py-1.5 rounded-lg btn-press flex-shrink-0"
          style={{ background: '#fff', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
          복사
        </button>
      </div>
    </div>
  ) : (
    <div className="rounded-xl p-3"
      style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
      <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>
        ⚠️ {account.name}님의 환급 계좌가 등록되어 있지 않아요
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
        반려 처리 후 직접 환불해주세요
      </p>
    </div>
  )
}