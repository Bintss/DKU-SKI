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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('posts').upload(fileName, file)
    if (error) { alert('업로드 실패'); setImageUploading(false); return }
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

    // 채널 접근 권한 체크
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, join_type')
      .eq('id', user.id)
      .single()

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
      title,
      content,
      channel,
      is_anonymous: isAnonymous,
      image_url: imageUrl || null,
      author_id: user.id,
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    router.push('/community')
  }

  const CHANNELS = [
    { value: 'free', label: '자유' },
    { value: 'student', label: '재학생' },
    { value: 'ob', label: 'OB' },
  ]

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">글쓰기</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 채널 선택 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">채널</label>
          <div className="flex gap-2">
            {CHANNELS.map(ch => (
              <button
                key={ch.value}
                type="button"
                onClick={() => setChannel(ch.value)}
                className={`text-xs px-4 py-2 rounded-xl border font-medium transition-colors ${
                  channel === ch.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                }`}
                style={channel === ch.value ? { background: 'var(--ski-blue)' } : {}}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">제목</label>
          <input
            type="text"
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">내용</label>
          <textarea
            placeholder="내용을 입력해주세요"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
            required
          />
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">이미지 (선택)</label>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="미리보기" className="w-full h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-lg"
              >
                삭제
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              style={{ borderColor: 'var(--gray-300)' }}
            >
              {imageUploading ? (
                <p className="text-sm text-gray-400">업로드 중...</p>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <p className="text-sm text-gray-400">사진 추가</p>
                </>
              )}
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* 익명 여부 */}
        <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
          <div>
            <p className="text-sm text-gray-700">익명으로 작성</p>
            <p className="text-xs text-gray-400 mt-0.5">운영진에게는 작성자가 표시돼요</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: isAnonymous ? 'var(--ski-blue)' : 'var(--gray-200)' }}
          >
            <span
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isAnonymous ? '28px' : '4px' }}
            />
          </button>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--ski-blue)' }}
        >
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