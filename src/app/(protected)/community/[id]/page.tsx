'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

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

type Comment = {
  id: string
  content: string
  author_id: string
  created_at: string
  profiles: { name: string; generation: number; avatar_url: string | null } | null
}

const CHANNEL_LABEL: Record<string, string> = {
  free: '자유', student: '재학생', ob: 'OB'
}

export default function PostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: postData }, { data: profileData }, { data: commentData }] =
      await Promise.all([
        supabase.from('posts').select('*, profiles(name, generation, avatar_url)').eq('id', id).single(),
        supabase.from('profiles').select('id, role').eq('id', user.id).single(),
        supabase.from('comments')
          .select('*, profiles(name, generation, avatar_url)')
          .eq('post_id', id)
          .order('created_at', { ascending: true }),
      ])

    setPost(postData)
    setProfile(profileData)
    setComments(commentData ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const getAuthorDisplay = (isAnonymous: boolean, profiles: Post['profiles']) => {
    if (!isAnonymous) return {
      name: profiles?.name ?? '알 수 없음',
      generation: profiles?.generation ?? null,
      avatar_url: profiles?.avatar_url ?? null,
    }
    if (profile?.role === 'admin') return {
      name: `${profiles?.name} (익명)`,
      generation: profiles?.generation ?? null,
      avatar_url: profiles?.avatar_url ?? null,
    }
    return { name: '익명', generation: null, avatar_url: null }
  }

  const handleDeletePost = async () => {
    if (!confirm('게시글을 삭제할까요?')) return
    await supabase.from('posts').delete().eq('id', id as string)
    router.push('/community')
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !profile) return
    setSubmitting(true)

    await supabase.from('comments').insert({
      post_id: id as string,
      author_id: profile.id,
      content: newComment.trim(),
    })

    setNewComment('')
    setSubmitting(false)
    fetchData()
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
    fetchData()
  }

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
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  if (!post) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">게시글을 찾을 수 없어요</p>
    </div>
  )

  const canDelete = profile?.id === post.author_id || profile?.role === 'admin'
  const author = getAuthorDisplay(post.is_anonymous, post.profiles)

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <a href="/community" className="text-xs text-gray-400 hover:text-gray-600">← 목록</a>
        {canDelete && (
          <button
            onClick={handleDeletePost}
            className="text-xs text-red-400 hover:text-red-500"
          >
            삭제
          </button>
        )}
      </div>

      {/* 게시글 */}
      <div className="bg-white border rounded-2xl p-5 mb-4">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full mb-3 inline-block"
          style={{ background: 'var(--ski-blue-50)', color: 'var(--ski-blue)' }}
        >
          {CHANNEL_LABEL[post.channel]}
        </span>

        <h1 className="text-lg font-semibold text-gray-900 mb-3">{post.title}</h1>

        {/* 작성자 */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
              style={{ background: post.is_anonymous && profile?.role !== 'admin' ? '#ADB5BD' : 'var(--ski-blue)' }}
            >
              {author.name[0]}
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">{author.name}</span>
          {author.generation && (
            <span className="text-xs text-gray-400">{author.generation}기</span>
          )}
          {post.is_anonymous && profile?.role === 'admin' && (
            <span className="text-xs bg-orange-50 text-orange-400 px-1.5 py-0.5 rounded-full">익명</span>
          )}
          <span className="text-xs text-gray-300 ml-auto">{formatDate(post.created_at)}</span>
        </div>

        {/* 이미지 */}
        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full rounded-xl mb-4 object-cover" />
        )}

        {/* 본문 */}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* 댓글 */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          댓글 <span className="text-gray-900 ml-1">{comments.length}</span>
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">첫 댓글을 남겨보세요</p>
        ) : (
          <div className="flex flex-col gap-4 mb-5">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                    style={{ background: 'var(--ski-blue)' }}
                  >
                    {c.profiles?.name?.[0] ?? '?'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{c.profiles?.name}</span>
                    <span className="text-xs text-gray-400">{c.profiles?.generation}기</span>
                    <span className="text-xs text-gray-300 ml-auto">{formatDate(c.created_at)}</span>
                    {(profile?.id === c.author_id || profile?.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs text-gray-300 hover:text-red-400"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 댓글 입력 */}
        <form onSubmit={handleAddComment} className="flex gap-2 border-t pt-4">
          <input
            type="text"
            placeholder="댓글을 입력해주세요"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="flex-1 bg-gray-50 border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="text-white px-4 rounded-xl text-sm font-medium disabled:opacity-50 flex-shrink-0"
            style={{ background: 'var(--ski-blue)' }}
          >
            등록
          </button>
        </form>
      </div>
    </main>
  )
}