'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
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
  profiles: {
    name: string
    bank_name: string | null
    account_number: string | null
    account_holder: string | null
  } | null
}

type SettlementItem = {
  id: string
  user_id: string
  amount: number
  is_paid: boolean
  paid_at: string | null
  profiles: {
    name: string
    generation: number
    bank_name: string | null
    account_number: string | null
  } | null
}

export default function SettlementDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [items, setItems] = useState<SettlementItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!profile) return

    const [{ data: settlementData }, { data: itemData }] = await Promise.all([
      supabase.from('settlements')
        .select('*, profiles(name, bank_name, account_number, account_holder)')
        .eq('id', id).single(),
      supabase.from('settlement_items')
        .select('*, profiles(name, generation, bank_name, account_number)')
        .eq('settlement_id', id)
        .order('is_paid'),
    ])

    setSettlement(settlementData)
    setItems(itemData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, id])

  const handleMarkPaid = async (itemId: string, current: boolean) => {
    await supabase.from('settlement_items').update({
      is_paid: !current,
      paid_at: !current ? new Date().toISOString() : null,
    }).eq('id', itemId)
    fetchData()
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
    // 토스 앱 딥링크 시도
    const tossDeepLink = `supertoss://send?bank=${encodeURIComponent(bankName)}&accountNo=${accountNumber}&amount=${amount}&origin=${encodeURIComponent(name)}`
    window.location.href = tossDeepLink

    // 앱 미설치 시 1.5초 후 토스 웹으로 fallback
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

  const copyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber)
      .then(() => alert('계좌번호가 복사됐어요'))
      .catch(() => alert(accountNumber))
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
  const paidCount = items.filter(i => i.is_paid).length
  const totalCount = items.length
  const collectedAmount = items.filter(i => i.is_paid).reduce((s, i) => s + i.amount, 0)
  const progressPct = totalCount > 0 ? (paidCount / totalCount) * 100 : 0

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <a href="/settlement" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 정산 목록</a>
        {(isCreator || isAdmin) && (
          <button onClick={handleDelete}
            className="text-xs font-black btn-press" style={{ color: '#FF6B6B' }}>
            삭제
          </button>
        )}
      </div>

      {/* 정산 헤더 카드 */}
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

        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>총 금액</p>
            <p className="text-2xl font-black" style={{ color: '#fff' }}>
              {settlement.total_amount.toLocaleString()}원
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>수금 현황</p>
            <p className="text-sm font-black" style={{ color: '#fff' }}>
              {paidCount}/{totalCount}명 · {collectedAmount.toLocaleString()}원
            </p>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: 'rgba(255,255,255,0.7)',
            }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {Math.round(progressPct)}% 수금 완료
        </p>
      </div>

      {/* 내 정산 카드 */}
      {myItem && (
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: myItem.is_paid
              ? 'rgba(46,204,113,0.1)' : 'rgba(240,149,149,0.1)',
            border: `0.5px solid ${myItem.is_paid
              ? 'rgba(46,204,113,0.3)' : 'rgba(240,149,149,0.3)'}`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black tracking-widest uppercase"
              style={{ color: myItem.is_paid ? 'rgba(46,204,113,0.7)' : 'rgba(240,149,149,0.7)' }}>
              내 정산
            </p>
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{
                background: myItem.is_paid ? 'rgba(46,204,113,0.2)' : 'rgba(240,149,149,0.2)',
                color: myItem.is_paid ? 'var(--accent-green)' : '#F09595',
              }}>
              {myItem.is_paid ? '납부완료' : '미납'}
            </span>
          </div>

          <p className="text-3xl font-black mb-1"
            style={{ color: myItem.is_paid ? 'var(--accent-green)' : '#F09595' }}>
            {myItem.amount.toLocaleString()}원
          </p>

          {settlement.due_date && !myItem.is_paid && (
            <p className="text-xs mb-3" style={{ color: 'rgba(240,149,149,0.7)' }}>
              마감일: {settlement.due_date}
            </p>
          )}

          {/* 송금 계좌 정보 */}
          {!myItem.is_paid && settlement.profiles?.account_number && (
            <div className="rounded-xl p-3 mb-3"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.1)',
              }}>
              <p className="text-xs font-black mb-1" style={{ color: 'var(--text-hint)' }}>
                송금 계좌
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {settlement.profiles.bank_name} {settlement.profiles.account_number}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {settlement.profiles.account_holder ?? settlement.profiles.name}
              </p>
            </div>
          )}

          {/* 토스 송금 버튼 */}
          {!myItem.is_paid && settlement.profiles?.account_number && (
            <button
              onClick={() => openToss(
                settlement.profiles!.account_number!,
                settlement.profiles!.bank_name ?? '',
                myItem.amount,
                settlement.profiles!.name,
              )}
              className="w-full py-3 rounded-xl text-sm font-black btn-press mb-2"
              style={{ background: '#3182F6', color: '#fff' }}>
              토스로 송금하기
            </button>
          )}

          {/* 계좌번호 복사 */}
          {!myItem.is_paid && settlement.profiles?.account_number && (
            <button
              onClick={() => copyAccount(settlement.profiles!.account_number!)}
              className="w-full py-2.5 rounded-xl text-xs font-black btn-press"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-tertiary)',
                border: '0.5px solid var(--border-primary)',
              }}>
              계좌번호 복사
            </button>
          )}

          {/* 계좌 미등록 안내 */}
          {!myItem.is_paid && !settlement.profiles?.account_number && (
            <div className="rounded-xl p-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid var(--border-primary)',
              }}>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                요청자가 계좌 정보를 등록하지 않았어요
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                직접 연락해서 계좌를 확인해주세요
              </p>
            </div>
          )}
        </div>
      )}

      {/* 전체 현황 */}
      <div className="rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-4"
          style={{ color: 'var(--text-hint)' }}>
          전체 현황
          <span className="ml-2 font-black" style={{ color: 'var(--text-tertiary)' }}>
            {paidCount}/{totalCount}
          </span>
        </h2>

        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.id}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{
                  background: item.user_id === profile?.id
                    ? 'var(--accent-green)'
                    : item.is_paid ? 'rgba(46,204,113,0.3)' : 'var(--ski-blue)',
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
                  style={{ color: item.is_paid ? 'var(--accent-green)' : '#F09595' }}>
                  {item.amount.toLocaleString()}원
                </span>
              </div>

              {/* 운영진/요청자: 납부 처리 버튼 */}
              {(isCreator || isAdmin) ? (
                <button onClick={() => handleMarkPaid(item.id, item.is_paid)}
                  className="text-xs font-black px-2.5 py-1.5 rounded-lg flex-shrink-0 btn-press"
                  style={{
                    background: item.is_paid
                      ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.06)',
                    color: item.is_paid ? 'var(--accent-green)' : 'var(--text-tertiary)',
                    border: `0.5px solid ${item.is_paid
                      ? 'rgba(46,204,113,0.3)' : 'var(--border-primary)'}`,
                  }}>
                  {item.is_paid ? '납부완료' : '미납'}
                </button>
              ) : (
                <span className="text-xs font-black px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{
                    background: item.is_paid
                      ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.04)',
                    color: item.is_paid ? 'var(--accent-green)' : 'var(--text-hint)',
                  }}>
                  {item.is_paid ? '완료' : '미납'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}