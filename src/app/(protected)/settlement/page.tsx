'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SkeletonList } from '@/components/Skeleton'

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
}

export default function SettlementPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [myItems, setMyItems] = useState<SettlementItem[]>([])
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'mine'>('mine')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: profileData }, { data: settlementData }, { data: itemData }] =
        await Promise.all([
          supabase.from('profiles').select('id, role').eq('id', user.id).single(),
          supabase.from('settlements')
            .select('*, profiles(name)')
            .order('created_at', { ascending: false }),
          supabase.from('settlement_items')
            .select('*').eq('user_id', user.id),
        ])

      setProfile(profileData)
      setSettlements(settlementData ?? [])
      setMyItems(itemData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

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

  const mySettlements = settlements.filter(s => getMyItem(s.id))
  const displaySettlements = tab === 'mine' ? mySettlements : settlements

  const totalUnpaid = myItems
    .filter(i => !i.is_paid)
    .reduce((sum, i) => sum + i.amount, 0)

  if (loading) return (
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

      {/* 미납 요약 */}
      {totalUnpaid > 0 && (
        <div className="rounded-2xl p-5 mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(240,149,149,0.2) 0%, rgba(240,149,149,0.1) 100%)',
            border: '0.5px solid rgba(240,149,149,0.3)',
          }}>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'rgba(240,149,149,0.7)' }}>미납 금액</p>
          <p className="text-2xl font-black" style={{ color: '#F09595' }}>
            {totalUnpaid.toLocaleString()}원
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(240,149,149,0.6)' }}>
            미납된 정산이 {myItems.filter(i => !i.is_paid).length}건 있어요
          </p>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-4 mb-6"
        style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
        {[
          { value: 'mine', label: '내 정산' },
          { value: 'all', label: '전체' },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value as 'all' | 'mine')}
            className="pb-3 text-sm font-black transition-colors relative"
            style={{ color: tab === t.value ? 'var(--text-primary)' : 'var(--text-hint)' }}>
            {t.label}
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
            style={{ color: 'rgba(255,255,255,0.05)' }}>ALL CLEAR</p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {tab === 'mine' ? '참여한 정산이 없어요' : '등록된 정산이 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displaySettlements.map(s => {
            const myItem = getMyItem(s.id)
            const isPaid = myItem?.is_paid ?? false
            const isMySettlement = s.created_by === profile?.id

            return (
              <a key={s.id} href={`/settlement/${s.id}`}
                className="block rounded-2xl p-5 card-hover btn-press"
                style={{
                  background: 'var(--bg-card)',
                  border: `0.5px solid ${!isPaid && myItem ? 'rgba(240,149,149,0.3)' : 'var(--border-primary)'}`,
                }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isMySettlement && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                        내가 요청
                      </span>
                    )}
                    {myItem && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{
                          background: isPaid ? 'rgba(46,204,113,0.15)' : 'rgba(240,149,149,0.15)',
                          color: isPaid ? 'var(--accent-green)' : '#F09595',
                        }}>
                        {isPaid ? '납부완료' : '미납'}
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
                        style={{ color: isPaid ? 'var(--text-tertiary)' : '#F09595' }}>
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
                      {new Date(s.due_date) < new Date() ? '기한 초과' : `~${s.due_date.slice(5)}`}
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