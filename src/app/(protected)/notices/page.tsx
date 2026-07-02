'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonNotice } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Notice = {
  id: string
  title: string
  content: string
  image_url: string | null
  is_pinned: boolean
  created_at: string
  profiles: { name: string } | null
}

export default function NoticesPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [notices, setNotices] = useState<Notice[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!profile) return
    const [{ data: noticeData }, { data: readData }] = await Promise.all([
      supabase.from('notices')
        .select('*, profiles(name)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('notice_reads').select('notice_id').eq('user_id', profile.id),
    ])
    setNotices(noticeData ?? [])
    const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
    setUnreadIds(new Set((noticeData ?? []).filter(n => !readSet.has(n.id)).map(n => n.id)))
    setLoading(false)
  }, [profile, supabase])

  useEffect(() => { fetchData() }, [fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!profile })

  const formatDate = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-24 mb-5 animate-pulse"
        style={{ background: 'var(--surface-low)' }} />
      <SkeletonNotice />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Notice</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>공지사항</h1>
        </div>
        {profile?.role === 'admin' && (
          <a href="/notices/new"
            className="text-xs font-black px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            + 작성
          </a>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>등록된 공지사항이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notices.map(notice => {
            const isUnread = unreadIds.has(notice.id)
            return (
              <a key={notice.id} href={`/notices/${notice.id}`}
                className="block rounded-2xl p-5 card-hover btn-press"
                style={{
                  background: isUnread ? 'rgba(0,60,117,0.04)' : '#fff',
                  border: `1px solid ${isUnread ? 'var(--dku-blue-light)' : 'var(--border-primary)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {notice.is_pinned && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                          고정
                        </span>
                      )}
                      {isUnread && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--accent-red)' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold mb-1 truncate"
                      style={{ color: 'var(--text-primary)' }}>
                      {notice.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {notice.content}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                      style={{ background: 'var(--dku-blue)' }} />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                    {notice.profiles?.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                    {formatDate(notice.created_at)}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}