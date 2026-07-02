'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import Link from 'next/link'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Post = {
  id: string
  title: string
  content: string
  channel: string
  is_anonymous: boolean
  created_at: string
  author_id: string
  image_urls: string[] | null
  profiles: { name: string; generation: number; avatar_url: string | null } | null
}

type Comment = {
  id: string
  content: string
  is_anonymous: boolean
  created_at: string
  author_id: string
  profiles: { name: string; generation: number; avatar_url: string | null } | null
}

const CHANNEL_LABEL: Record<string, string> = {
  free: '자유', student: '재학생', ob: 'OB'
}

export default function PostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const fetchData = useCallback(async () => {
    if (!profile) return
    const [{ data: postData }, { data: commentData }] = await Promise.all([
      supabase.from('posts')
        .select('*, profiles(name, generation, avatar_url)')
        .eq('id', id).single(),
      supabase.from('comments')
        .select('*, profiles(name, generation, avatar_url)')
        .eq('post_id', id)
        .order('created_at', { ascending: true }),
    ])
    setPost(postData)
    setComments(commentData ?? [])
    setLoading(false)
  }, [profile, id, supabase])

  useEffect(() => { if (profile) fetchData() }, [profile, fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!profile, debounceMs: 3000 })

  const getAuthorDisplay = (item: { is_anonymous: boolean; profiles: { name: string; generation: number } | null; author_id: string }) => {
    if (!item.is_anonymous) {
      return {
        name: item.profiles?.name ?? '알 수 없음',
        sub: item.profiles?.generation ? `${item.profiles.generation}기` : '',
        isAnon: false,
      }
    }
    if (profile?.role === 'admin') {
      return {
        name: `${item.profiles?.name ?? '알 수 없음'} (익명)`,
        sub: item.profiles?.generation ? `${item.profiles.generation}기` : '',
        isAnon: true,
      }
    }
    if (item.author_id === profile?.id) {
      return { name: '익명 (나)', sub: '', isAnon: true }
    }
    return { name: '익명', sub: '', isAnon: true }
  }

  const handleDeletePost = async () => {
    if (!confirm('게시글을 삭제할까요?')) return
    await supabase.from('posts').delete().eq('id', id as string)
    router.push('/community')
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !profile) return
    setSubmitting(true)
    await supabase.from('comments').insert({
      post_id: id, content: newComment.trim(),
      author_id: profile.id, is_anonymous: isAnonymous,
    })
    setNewComment('')
    setSubmitting(false)
    fetchData()
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제할까요?')) return
    await supabase.from('comments').delete().eq('id', commentId)
    fetchData()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!post) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>게시글을 찾을 수 없어요</p>
    </div>
  )

  const isPostAuthor = post.author_id === profile?.id
  const postAuthor = getAuthorDisplay(post)

  return (
    <main className="max-w-lg mx-auto px-4 pb-32">
      <div className="flex items-center justify-between mb-4">
        <Link href="/community" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 커뮤니티</Link>
        {(isPostAuthor || profile?.role === 'admin') && (
          <button onClick={handleDeletePost}
            className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--accent-red)' }}>
            삭제
          </button>
        )}
      </div>

      {/* 게시글 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
            {CHANNEL_LABEL[post.channel] ?? post.channel}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
            {formatDate(post.created_at)}
          </span>
        </div>

        <h1 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
          {post.title}
        </h1>

        <div className="flex items-center gap-2.5 mb-4 pb-4"
          style={{ borderBottom: '1px solid var(--border-primary)' }}>
          {postAuthor.isAnon ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: 'var(--surface-low)', color: 'var(--text-tertiary)' }}>
              ?
            </div>
          ) : post.profiles?.avatar_url ? (
            <img src={post.profiles.avatar_url} alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              {postAuthor.name[0]}
            </div>
          )}
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {postAuthor.name}
            </p>
            {postAuthor.sub && (
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>{postAuthor.sub}</p>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4"
          style={{ color: 'var(--text-secondary)' }}>
          {post.content}
        </p>

        {post.image_urls && post.image_urls.length > 0 && (
          <div className="grid gap-2"
            style={{ gridTemplateColumns: post.image_urls.length === 1 ? '1fr' : '1fr 1fr' }}>
            {post.image_urls.map((url, i) => (
              <img key={i} src={url} alt=""
                className="w-full rounded-xl object-cover cursor-pointer"
                style={{ maxHeight: 280 }}
                onClick={() => setLightboxUrl(url)} />
            ))}
          </div>
        )}
      </div>

      {/* 댓글 */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="px-5 py-4"
          style={{ borderBottom: comments.length > 0 ? '1px solid var(--border-primary)' : 'none' }}>
          <p className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            댓글 {comments.length}
          </p>
        </div>

        {comments.map((comment, i) => {
          const author = getAuthorDisplay(comment)
          const isCommentAuthor = comment.author_id === profile?.id
          return (
            <div key={comment.id} className="px-5 py-4"
              style={{ borderBottom: i < comments.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
              <div className="flex items-start gap-2.5">
                {author.isAnon ? (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: 'var(--surface-low)', color: 'var(--text-tertiary)' }}>
                    ?
                  </div>
                ) : comment.profiles?.avatar_url ? (
                  <img src={comment.profiles.avatar_url} alt=""
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                    {author.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {author.name}
                    </span>
                    {author.sub && (
                      <span className="text-xs" style={{ color: 'var(--text-hint)' }}>{author.sub}</span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                      · {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {comment.content}
                  </p>
                </div>
                {(isCommentAuthor || profile?.role === 'admin') && (
                  <button onClick={() => handleDeleteComment(comment.id)}
                    className="text-xs flex-shrink-0 btn-press" style={{ color: 'var(--text-hint)' }}>
                    삭제
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 댓글 입력 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-6 pt-3"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border-primary)',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
        }}>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setIsAnonymous(!isAnonymous)}
            className="text-xs font-black px-3 py-1.5 rounded-full btn-press"
            style={{
              background: isAnonymous ? 'var(--ski-blue-50)' : 'var(--surface-low)',
              border: `1px solid ${isAnonymous ? 'var(--dku-blue-light)' : 'var(--border-primary)'}`,
              color: isAnonymous ? 'var(--dku-blue-primary)' : 'var(--text-tertiary)',
            }}>
            {isAnonymous ? '익명 ON' : '익명 OFF'}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
            {isAnonymous ? '이름이 숨겨져요' : `${profile?.name}으로 댓글 달아요`}
          </span>
        </div>
        <div className="flex gap-2">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleAddComment()
              }
            }}
            placeholder="댓글을 입력하세요..."
            rows={1}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm resize-none"
            style={{
              background: 'var(--surface-low)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
            }} />
          <button onClick={handleAddComment}
            disabled={submitting || !newComment.trim()}
            className="rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-40 btn-press flex-shrink-0"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            {submitting ? '...' : '등록'}
          </button>
        </div>
      </div>

      {/* 이미지 라이트박스 */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </main>
  )
}