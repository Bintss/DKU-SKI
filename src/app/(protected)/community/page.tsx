'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Post = {
  id: string
  title: string
  content: string
  channel: string
  is_anonymous: boolean
  created_at: string
  profiles: { name: string; generation: number } | null
  comment_count: number
  image_urls: string[] | null
}

const CHANNELS = [
  { value: 'all', label: '전체' },
  { value: 'free', label: '자유' },
  { value: 'student', label: '재학생' },
  { value: 'ob', label: 'OB' },
]

const CHANNEL_LABEL: Record<string, string> = {
  free: '자유', student: '재학생', ob: 'OB'
}

export default function CommunityPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChannel, setActiveChannel] = useState('all')
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!profile) return
    let query = supabase
      .from('posts')
      .select('id, title, content, channel, is_anonymous, created_at, profiles(name, generation), comments(id), image_urls')
      .order('created_at', { ascending: false })

    if (activeChannel !== 'all') {
      query = query.eq('channel', activeChannel)
    }

    // OB 채널은 OB와 운영진만
    if (profile.role !== 'admin' && profile.role !== 'ob') {
      query = query.neq('channel', 'ob')
    }

    const { data } = await query
    setPosts((data ?? []).map((p: any) => ({
      ...p,
      comment_count: p.comments?.length ?? 0,
    })))
    setLoading(false)
  }, [profile, activeChannel, supabase])

  useEffect(() => { fetchData() }, [fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!profile })

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diffMin = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60))
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}시간 전`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  const getAuthorName = (post: Post) => {
    if (!post.is_anonymous) return post.profiles?.name ?? '알 수 없음'
    if (profile?.role === 'admin') return `${post.profiles?.name} (익명)`
    return '익명'
  }

  const availableChannels = CHANNELS.filter(c => {
    if (c.value === 'ob' && profile?.role !== 'admin' && profile?.role !== 'ob') return false
    return true
  })

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-24 mb-5 animate-pulse"
        style={{ background: 'var(--surface-low)' }} />
      <SkeletonList count={4} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Community</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>커뮤니티</h1>
        </div>
        <a href="/community/new"
          className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
          style={{ background: 'var(--dku-blue-primary)' }}>
          + 글쓰기
        </a>
      </div>

      {/* 채널 탭 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {availableChannels.map(ch => (
          <button key={ch.value}
            onClick={() => setActiveChannel(ch.value)}
            className="px-4 py-2 rounded-full text-xs font-black whitespace-nowrap btn-press flex-shrink-0"
            style={{
              background: activeChannel === ch.value ? 'var(--dku-blue-primary)' : '#fff',
              border: `1px solid ${activeChannel === ch.value ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
              color: activeChannel === ch.value ? '#fff' : 'var(--text-tertiary)',
            }}>
            {ch.label}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>아직 게시글이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <a key={post.id} href={`/community/${post.id}`}
              className="block rounded-2xl p-5 card-hover btn-press"
              style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                  {CHANNEL_LABEL[post.channel] ?? post.channel}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                  {getAuthorName(post)}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                  · {formatRelativeTime(post.created_at)}
                </span>
              </div>

              <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {post.title}
              </p>
              <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {post.content}
              </p>

              {post.image_urls && post.image_urls.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {post.image_urls.slice(0, 3).map((url, i) => (
                    <img key={i} src={url} alt=""
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ))}
                  {post.image_urls.length > 3 && (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)' }}>
                      <span className="text-xs font-black" style={{ color: 'var(--text-tertiary)' }}>
                        +{post.image_urls.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                {post.comment_count > 0 && (
                  <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>
                    댓글 {post.comment_count}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}