'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Notice = {
  id: string
  title: string
  content: string
  image_url: string | null
  file_url: string | null
  file_name: string | null
  is_pinned: boolean
  author_id: string
  created_at: string
  profiles: { name: string } | null
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ role: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: profileData }, { data: noticeData }, { data: readData }] =
        await Promise.all([
          supabase.from('profiles').select('role').eq('id', user.id).single(),
          supabase.from('notices')
            .select('*, profiles(name)')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase.from('notice_reads').select('notice_id').eq('user_id', user.id),
        ])

      setProfile(profileData)
      setNotices(noticeData ?? [])

      const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
      const unread = new Set(
        (noticeData ?? [])
          .filter(n => !readSet.has(n.id))
          .map(n => n.id)
      )
      setUnreadIds(unread)
      setLoading(false)
    }
    fetchData()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">공지사항</h1>
        {profile?.role === 'admin' && (
          <a
            href="/notices/new"
            className="text-xs text-white px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--ski-blue)' }}
          >
            + 공지 작성
          </a>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📢</p>
          <p className="text-sm text-gray-400">등록된 공지사항이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notices.map(notice => {
            const isUnread = unreadIds.has(notice.id)
            return (
              <a
                key={notice.id}
                href={`/notices/${notice.id}`}
                className="block bg-white border rounded-2xl p-5 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {notice.is_pinned && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--ski-blue-50)', color: 'var(--ski-blue)' }}
                        >
                          📌 고정
                        </span>
                      )}
                      {isUnread && (
                        <span className="text-xs font-medium bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold mb-1 ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                      {notice.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{notice.content}</p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{notice.profiles?.name}</span>
                  <span className="text-xs text-gray-400">{formatDate(notice.created_at)}</span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}