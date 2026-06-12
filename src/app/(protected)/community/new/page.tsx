'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function NewPostForm() {
  const searchParams = useSearchParams()
  const initialChannel = searchParams.get('channel') ?? 'free'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState(initialChannel)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`
    await supabase.storage.from('posts').upload(fileName, file)
    const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
    setImageUrl(data.publicUrl)
    setImageUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles').select('role, join_type').eq('id', user.id).single()

    const isAdmin = profileData?.role === 'admin'
    if (!isAdmin) {
      if (channel === 'student' && profileData?.join_type !== 'student') {
        setError('재학생만 작성할 수 있어요')
        setSubmitting(false)
        return
      }
      if (channel === 'ob' && profileData?.join_type !== 'ob') {
        setError('OB만 작성할 수 있어요')
        setSubmitting(false)
        return
      }
    }

    const { error } = await supabase.from('posts').insert({
      title, content, channel, is_anonymous: isAnonymous,
      image_url: imageUrl || null, author_id: user.id,
    })

    if (error) { setError(error.message); setSubmitting(false); return }
    router.push('/community')
  }

  const CHANNELS = [
    { value: 'free', label: '자유' },
    { value: 'student', label: '재학생' },
    { value: 'ob', label: 'OB' },
  ]

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Community</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>글쓰기</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 채널 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-2 block"
            style={{ color: 'var(--text-hint)' }}>채널</label>
          <div className="flex gap-2">
            {CHANNELS.map(ch => (
              <button key={ch.value} type="button" onClick={() => setChannel(ch.value)}
                className="text-xs font-black px-4 py-2 rounded-xl btn-press"
                style={{
                  background: channel === ch.value ? 'var(--ski-blue)' : 'var(--bg-card)',
                  border: `0.5px solid ${channel === ch.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                  color: channel === ch.value ? '#fff' : 'var(--text-tertiary)',
                }}>
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>제목</label>
          <input type="text" placeholder="제목을 입력해주세요" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>내용</label>
          <textarea placeholder="내용을 입력해주세요" value={content}
            onChange={e => setContent(e.target.value)} rows={8}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none" style={inputStyle} required />
        </div>

        {/* 이미지 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>이미지 (선택)</label>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="미리보기" className="w-full h-48 object-cover rounded-xl" />
              <button type="button" onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 text-xs font-black px-2.5 py-1.5 rounded-lg btn-press"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>삭제</button>
            </div>
          ) : (
            <button type="button" onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="w-full h-28 rounded-xl flex flex-col items-center justify-center gap-2 btn-press"
              style={{ border: '1px dashed var(--border-secondary)', background: 'var(--bg-card)' }}>
              {imageUploading ? (
                <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
              ) : (
                <>
                  <i className="ti ti-photo" style={{ fontSize: 24, color: 'var(--text-hint)' }} aria-hidden="true" />
                  <p className="text-sm" style={{ color: 'var(--text-hint)' }}>사진 추가</p>
                </>
              )}
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*"
            onChange={handleImageUpload} className="hidden" />
        </div>

        {/* 익명 */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>익명으로 작성</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
              운영진에게는 작성자가 표시돼요
            </p>
          </div>
          <button type="button" onClick={() => setIsAnonymous(!isAnonymous)}
            className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: isAnonymous ? 'var(--ski-blue)' : 'rgba(255,255,255,0.1)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isAnonymous ? '28px' : '4px' }} />
          </button>
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--ski-blue)' }}>
          {submitting ? '등록 중...' : '게시하기'}
        </button>
      </form>
    </main>
  )
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostForm />
    </Suspense>
  )
}