'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SkeletonList } from '@/components/Skeleton'

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

type Profile = {
  id: string
  role: string
  join_type: string
}

const CHANNELS = [
  { value: 'free', label: '자유', desc: '모든 부원' },
  { value: 'student', label: '재학생', desc: '재학생 전용' },
  { value: 'ob', label: 'OB', desc: 'OB 전용' },
]

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [channel, setChannel] = useState('free')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('id, role, join_type')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(name, generation, avatar_url)')
        .eq('channel', channel)
        .order('created_at', { ascending: false })
      setPosts(data ?? [])
      setLoading(false)
    }
    fetchPosts()
  }, [channel])

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

  // 채널 접근 권한
  const canAccess = (ch: string) => {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (ch === 'free') return true
    if (ch === 'student') return profile.join_type === 'student'
    if (ch === 'ob') return profile.join_type === 'ob'
    return false
  }

  // 채널 작성 권한
  const canWrite = (ch: string) => {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (ch === 'free') return true
    if (ch === 'student') return profile.join_type === 'student'
    if (ch === 'ob') return profile.join_type === 'ob'
    return false
  }

  // 작성자 표시
  const getAuthorDisplay = (post: Post) => {
    if (post.is_anonymous && profile?.role !== 'admin') {
      return { name: '익명', generation: null, avatar_url: null }
    }
    if (post.is_anonymous && profile?.role === 'admin') {
      return {
        name: `${post.profiles?.name} (익명)`,
        generation: post.profiles?.generation ?? null,
        avatar_url: post.profiles?.avatar_url ?? null,
      }
    }
    return {
      name: post.profiles?.name ?? '알 수 없음',
      generation: post.profiles?.generation ?? null,
      avatar_url: post.profiles?.avatar_url ?? null,
    }
  }

  const accessibleChannels = CHANNELS.filter(ch => canAccess(ch.value))

  // 현재 채널이 접근 불가면 첫 번째 접근 가능한 채널로 이동
  useEffect(() => {
    if (profile && !canAccess(channel)) {
      setChannel(accessibleChannels[0]?.value ?? 'free')
    }
  }, [profile])

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">커뮤니티</h1>

      {/* 채널 탭 */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--gray-100)' }}>
        {accessibleChannels.map(ch => (
          <button
            key={ch.value}
            onClick={() => setChannel(ch.value)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
              channel === ch.value ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* 글쓰기 버튼 */}
      {canWrite(channel) && (
        <div className="flex justify-end mb-4">
          <a
            href={`/community/new?channel=${channel}`}
            className="text-xs text-white px-4 py-2 rounded-xl"
            style={{ background: 'var(--ski-blue)' }}
          >
            + 글쓰기
          </a>
        </div>
      )}

      {/* 접근 불가 안내 */}
      {!canWrite(channel) && (
        <div className="bg-gray-50 border rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-xs text-gray-400">
            {channel === 'student' ? '재학생만 글을 작성할 수 있어요' : 'OB만 글을 작성할 수 있어요'}
          </p>
        </div>
      )}

      {/* 게시글 목록 */}
      {loading ? (
        <main className="max-w-lg mx-auto px-4 pb-10">
    <div className="h-7 bg-gray-200 rounded-full w-24 mb-5 animate-pulse" />
    <SkeletonList count={4} />
  </main>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">아직 게시글이 없어요</p>
          {canWrite(channel) && (
            <a
              href={`/community/new?channel=${channel}`}
              className="mt-3 inline-block text-sm hover:underline"
              style={{ color: 'var(--ski-blue)' }}
            >
              첫 글을 작성해보세요
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => {
            const author = getAuthorDisplay(post)
            return (
              <a
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-white border rounded-2xl p-5 hover:border-gray-300 transition-colors card-hover"
>
                <div className="flex items-start gap-3">
                  {author.avatar_url ? (
                    <img
                      src={author.avatar_url}
                      alt={author.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                      style={{ background: post.is_anonymous && profile?.role !== 'admin' ? 'var(--gray-300)' : 'var(--ski-blue)' }}
                    >
                      {author.name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{author.name}</span>
                      {author.generation && (
                        <span className="text-xs text-gray-400">{author.generation}기</span>
                      )}
                      {post.is_anonymous && profile?.role === 'admin' && (
                        <span className="text-xs bg-orange-50 text-orange-400 px-1.5 py-0.5 rounded-full">익명</span>
                      )}
                      <span className="text-xs text-gray-300 ml-auto flex-shrink-0">{formatDate(post.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1 truncate">{post.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{post.content}</p>
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="mt-2 w-full h-32 object-cover rounded-xl"
                      />
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