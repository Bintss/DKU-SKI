'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

const CHANNELS = [
  { value: 'free', label: '자유', desc: '모든 부원이 볼 수 있어요' },
  { value: 'student', label: '재학생', desc: '재학생 부원만 볼 수 있어요' },
  { value: 'ob', label: 'OB', desc: 'OB와 운영진만 볼 수 있어요' },
]

export default function NewPostPage() {
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState('free')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputStyle = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

  useEffect(() => {
    if (!profile) return
    if (profile.role === 'ob') setChannel('ob')
    else setChannel('free')
  }, [profile])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (imageUrls.length + files.length > 5) {
      setError('이미지는 최대 5장까지 첨부할 수 있어요')
      return
    }
    setUploading(true)
    const uploaded: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('posts').upload(fileName, file)
      if (error) { setError('이미지 업로드에 실패했어요'); continue }
      const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
      uploaded.push(data.publicUrl)
    }
    setImageUrls(prev => [...prev, ...uploaded])
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || submitting) return
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setSubmitting(true); setError('')

    const { data, error } = await supabase.from('posts').insert({
      title: title.trim(), content: content.trim(),
      channel, is_anonymous: isAnonymous,
      author_id: profile.id,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    }).select().single()

    if (error) { setError(error.message); setSubmitting(false); return }
    router.push(`/community/${data.id}`)
  }

  const availableChannels = CHANNELS.filter(ch => {
    if (ch.value === 'ob' && profile?.role !== 'admin' && profile?.role !== 'ob') return false
    return true
  })

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Community</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>글쓰기</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 채널 선택 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-2 block"
            style={{ color: 'var(--text-hint)' }}>채널</label>
          <div className="flex flex-col gap-2">
            {availableChannels.map(ch => (
              <button key={ch.value} type="button"
                onClick={() => setChannel(ch.value)}
                className="text-left px-4 py-3 rounded-xl btn-press"
                style={{
                  background: channel === ch.value ? 'var(--ski-blue-50)' : '#fff',
                  border: `1px solid ${channel === ch.value ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
                }}>
                <p className="text-sm font-black"
                  style={{ color: channel === ch.value ? 'var(--dku-blue-primary)' : 'var(--text-primary)' }}>
                  {ch.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {ch.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>제목</label>
          <input type="text" placeholder="제목을 입력하세요"
            value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} required />
        </div>

        {/* 내용 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>내용</label>
          <textarea placeholder="내용을 입력하세요" rows={6}
            value={content} onChange={e => setContent(e.target.value)}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} required />
        </div>

        {/* 이미지 첨부 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-2 block"
            style={{ color: 'var(--text-hint)' }}>
            이미지 첨부 (최대 5장)
          </label>
          {imageUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'var(--accent-red)' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageUrls.length < 5 && (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-16 rounded-xl flex items-center justify-center gap-2 btn-press"
              style={{ border: '1.5px dashed var(--border-secondary)', background: 'var(--surface-low)' }}>
              {uploading ? (
                <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-hint)" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
                    사진 추가
                  </p>
                </>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple
            onChange={handleImageUpload} className="hidden" />
        </div>

        {/* 익명 토글 */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>익명으로 게시</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {isAnonymous ? '이름이 숨겨져요 (운영진은 볼 수 있어요)' : `${profile?.name}으로 게시돼요`}
            </p>
          </div>
          <button type="button" onClick={() => setIsAnonymous(!isAnonymous)}
            className="relative w-12 h-6 rounded-full transition-all duration-200"
            style={{ background: isAnonymous ? 'var(--dku-blue-primary)' : 'var(--border-secondary)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isAnonymous ? '28px' : '4px' }} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--dku-blue-primary)' }}>
          {submitting ? '게시 중...' : '게시하기'}
        </button>
      </form>
    </main>
  )
}