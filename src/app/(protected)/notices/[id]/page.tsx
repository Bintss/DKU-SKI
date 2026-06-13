'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

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

export default function NoticeDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const fetchData = async () => {
      const { data: noticeData } = await supabase
        .from('notices')
        .select('*, profiles(name)')
        .eq('id', id)
        .single()

      setNotice(noticeData)
      setLoading(false)

      // 읽음 처리 — 백그라운드에서 실행 (UI 블로킹 없음)
      supabase.from('notice_reads').upsert({
        notice_id: id as string,
        user_id: profile.id,
      }, { onConflict: 'notice_id,user_id' })
    }
    fetchData()
  }, [profile, id])

  const handleDelete = async () => {
    if (!confirm('공지사항을 삭제할까요?')) return
    await supabase.from('notices').delete().eq('id', id as string)
    router.push('/notices')
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!notice) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>공지사항을 찾을 수 없어요</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {profile?.role === 'admin' && (
        <div className="flex justify-end gap-2 mb-3">
          <a href={`/notices/${id}/edit`}
            className="text-xs font-black text-white px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'var(--ski-blue)' }}>
            수정
          </a>
          <button onClick={handleDelete}
            className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'rgba(242,48,48,0.15)', color: '#FF6B6B' }}>
            삭제
          </button>
        </div>
      )}

      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        {notice.is_pinned && (
          <span className="text-xs font-black px-2 py-0.5 rounded-full mb-3 inline-block"
            style={{ background: 'rgba(27,63,171,0.3)', color: 'var(--accent-blue)' }}>
            고정
          </span>
        )}

        <h1 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
          {notice.title}
        </h1>

        <div className="flex items-center justify-between mb-4 pb-4"
          style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
            {notice.profiles?.name}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
            {new Date(notice.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>

        {notice.image_url && (
          <img src={notice.image_url} alt="공지 이미지"
            className="w-full rounded-xl mb-4 object-cover" />
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-secondary)' }}>
          {notice.content}
        </p>

        {notice.file_url && (
          <a href={notice.file_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 mt-4 p-3 rounded-xl btn-press"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid var(--border-primary)',
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(27,63,171,0.2)' }}>
              <span className="text-sm" style={{ color: 'var(--accent-blue)' }}>📎</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
                {notice.file_name ?? '첨부파일'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>클릭하여 다운로드</p>
            </div>
            <span className="text-xs font-black flex-shrink-0"
              style={{ color: 'var(--text-hint)' }}>↓</span>
          </a>
        )}
      </div>
    </main>
  )
}