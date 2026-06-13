'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'

type Post = {
  id: string
  title: string
  content: string
  channel: string
  image_url: string | null
  is_anonymous: boolean
  author_id: string
  created_at: string
  profiles: { name: string; generation: number; avatar_url: string | null } | null
}

const CHANNELS = [
  { value: 'free', label: '자유' },
  { value: 'student', label: '재학생' },
  { value: 'ob', label: 'OB' },
]

export default function CommunityPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [postsByChannel, setPostsByChannel] = useState<Record<string, Post[]>>({})
  const [channel, setChannel] = useState('free')
  const [loadingChannels, setLoadingChannels] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  const canAccess = (ch: string) => {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (ch === 'free') return true
    if (ch === 'student') return profile.join_type === 'student'
    if (ch === 'ob') return profile.join_type === 'ob'
    return false
  }

  const accessibleChannels = CHANNELS.filter(ch => canAccess(ch.value))

  // 채널 변경 시 아직 불러오지 않은 채널만 fetch
  useEffect(() => {
    if (!profile) return
    if (postsByChannel[channel] !== undefined) return // 이미 캐시됨
    if (loadingChannels[channel]) return // 이미 로딩 중

    const fetchPosts = async () => {
      setLoadingChannels(prev => ({ ...prev, [channel]: true }))
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(name, generation, avatar_url)')
        .eq('channel', channel)
        .order('created_at', { ascending: false })
      setPostsByChannel(prev => ({ ...prev, [channel]: data ?? [] }))
      setLoadingChannels(prev => ({ ...prev, [channel]: false }))
    }
    fetchPosts()
  }, [profile, channel])

  // 접근 불가 채널이면 첫 번째 접근 가능 채널로 이동
  useEffect(() => {
    if (profile && !canAccess(channel)) {
      setChannel(accessibleChannels[0]?.value ?? 'free')
    }
  }, [profile])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) {
      const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
      if (diffH === 0) {
        const diffM = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        return diffM <= 1 ? '방금' : `${diffM}분 전`
      }
      return `${diffH}시간 전`
    }
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  const getAuthorDisplay = (post: Post) => {
    if (!post.is_anonymous) return {
      name: post.profiles?.name ?? '알 수 없음',
      generation: post.profiles?.generation ?? null,
      avatar_url: post.profiles?.avatar_url ?? null,
    }
    if (profile?.role === 'admin') return {
      name: `${post.profiles?.name} (익명)`,
      generation: post.profiles?.generation ?? null,
      avatar_url: post.profiles?.avatar_url ?? null,
    }
    return { name: '익명', generation: null, avatar_url: null }
  }

  const posts = postsByChannel[channel] ?? []
  const isLoading = profileLoading || loadingChannels[channel]

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Community</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>커뮤니티</h1>
        </div>
        {canAccess(channel) && (
          <a href={`/community/new?channel=${channel}`}
            className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--ski-blue)' }}>
            + 글쓰기
          </a>
        )}
      </div>

      {/* 채널 탭 */}
      <div className="flex gap-4 mb-6"
        style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
        {accessibleChannels.map(ch => (
          <button key={ch.value} onClick={() => setChannel(ch.value)}
            className="pb-3 text-sm font-black transition-colors relative"
            style={{ color: channel === ch.value ? 'var(--text-primary)' : 'var(--text-hint)' }}>
            {ch.label}
            {channel === ch.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--ski-blue)' }} />
            )}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black mb-2"
            style={{ color: 'rgba(255,255,255,0.04)' }}>NO POST</p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>아직 게시글이 없어요</p>
          {canAccess(channel) && (
            <a href={`/community/new?channel=${channel}`}
              className="mt-3 inline-block text-sm font-semibold"
              style={{ color: 'var(--accent-blue)' }}>
              첫 글을 작성해보세요
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map(post => {
            const author = getAuthorDisplay(post)
            return (
              <a key={post.id} href={`/community/${post.id}`}
                className="block rounded-2xl p-5 card-hover btn-press"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-primary)',
                }}>
                <div className="flex items-start gap-3">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{
                        background: post.is_anonymous && profile?.role !== 'admin'
                          ? 'rgba(255,255,255,0.1)' : 'var(--ski-blue)'
                      }}>
                      {author.name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        {author.name}
                      </span>
                      {author.generation && (
                        <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                          {author.generation}기
                        </span>
                      )}
                      {post.is_anonymous && profile?.role === 'admin' && (
                        <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(230,126,34,0.2)', color: 'var(--accent-orange)' }}>
                          익명
                        </span>
                      )}
                      <span className="text-xs ml-auto flex-shrink-0"
                        style={{ color: 'var(--text-hint)' }}>
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-bold mb-1 truncate"
                      style={{ color: 'var(--text-primary)' }}>
                      {post.title}
                    </p>
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                      {post.content}
                    </p>
                    {post.image_url && (
                      <img src={post.image_url} alt=""
                        className="mt-2 w-full h-32 object-cover rounded-xl" />
                    )}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}