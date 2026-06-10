'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

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
  const supabase = createClient()

  const [notice, setNotice] = useState<Notice | null>(null)
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: noticeData }, { data: profileData }] = await Promise.all([
        supabase.from('notices').select('*, profiles(name)').eq('id', id).single(),
        supabase.from('profiles').select('id, role').eq('id', user.id).single(),
      ])

      setNotice(noticeData)
      setProfile(profileData)

      // 읽음 처리
      await supabase.from('notice_reads').upsert({
        notice_id: id as string,
        user_id: user.id,
      }, { onConflict: 'notice_id,user_id' })

      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('공지사항을 삭제할까요?')) return
    await supabase.from('notices').delete().eq('id', id as string)
    router.push('/notices')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  if (!notice) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">공지사항을 찾을 수 없어요</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 운영진 버튼 */}
      {profile?.role === 'admin' && (
        <div className="flex justify-end gap-2 mb-3">
          <a
            href={`/notices/${id}/edit`}
            className="text-xs text-white px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--ski-blue)' }}
          >
            수정
          </a>
          <button
            onClick={handleDelete}
            className="text-xs bg-red-50 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100"
          >
            삭제
          </button>
        </div>
      )}

      {/* 공지 내용 */}
      <div className="bg-white border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          {notice.is_pinned && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--ski-blue-50)', color: 'var(--ski-blue)' }}
            >
              📌 고정
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-3">{notice.title}</h1>
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <span className="text-xs text-gray-400">{notice.profiles?.name}</span>
          <span className="text-xs text-gray-400">
            {new Date(notice.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>

        {/* 이미지 */}
        {notice.image_url && (
          <img
            src={notice.image_url}
            alt="공지 이미지"
            className="w-full rounded-xl mb-4 object-cover"
          />
        )}

        {/* 본문 */}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {notice.content}
        </p>

        {/* 파일 첨부 */}
        {notice.file_url && (
          <a
            href={notice.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 mt-4 p-3 rounded-xl border hover:border-blue-300 transition-colors"
            style={{ background: 'var(--gray-50)' }}
          >
            <span className="text-xl">📎</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {notice.file_name ?? '첨부파일'}
              </p>
              <p className="text-xs text-gray-400">클릭하여 다운로드</p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">↓</span>
          </a>
        )}
      </div>
    </main>
  )
}