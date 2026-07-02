'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

export default function EditNoticePage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
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
    if (profile.role !== 'admin') { router.push('/notices'); return }
    const fetchNotice = async () => {
      const { data } = await supabase.from('notices').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title); setContent(data.content); setIsPinned(data.is_pinned)
        setImageUrl(data.image_url ?? ''); setFileUrl(data.file_url ?? ''); setFileName(data.file_name ?? '')
      }
      setLoading(false)
    }
    fetchNotice()
  }, [profile, id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const uploadName = `images/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('notices').upload(uploadName, file)
    if (error) { setError('이미지 업로드에 실패했어요'); setImageUploading(false); return }
    const { data } = supabase.storage.from('notices').getPublicUrl(uploadName)
    setImageUrl(data.publicUrl); setImageUploading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true)
    const uploadName = `files/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('notices').upload(uploadName, file)
    if (error) { setError('파일 업로드에 실패했어요'); setFileUploading(false); return }
    const { data } = supabase.storage.from('notices').getPublicUrl(uploadName)
    setFileUrl(data.publicUrl); setFileName(file.name); setFileUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const { error } = await supabase.from('notices').update({
      title, content, is_pinned: isPinned,
      image_url: imageUrl || null, file_url: fileUrl || null, file_name: fileName || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id as string)
    if (error) { setError(error.message); setSubmitting(false); return }
    router.push(`/notices/${id}`)
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Notice</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>공지 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>제목</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} required />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>내용</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} required />
        </div>

        {/* 이미지 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>이미지</label>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="미리보기" className="w-full h-48 object-cover rounded-xl" />
              <button type="button" onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 text-xs font-black px-2.5 py-1.5 rounded-lg btn-press"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                삭제
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="w-full h-28 rounded-xl flex flex-col items-center justify-center gap-2 btn-press"
              style={{ border: '1.5px dashed var(--border-secondary)', background: 'var(--surface-low)' }}>
              {imageUploading
                ? <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
                : <>
                    <span className="text-2xl">🖼️</span>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>사진 추가</p>
                  </>
              }
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>

        {/* 파일 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>파일 첨부</label>
          {fileUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
              <span className="text-lg">📎</span>
              <p className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{fileName}</p>
              <button type="button" onClick={() => { setFileUrl(''); setFileName('') }}
                className="text-xs font-black btn-press" style={{ color: 'var(--accent-red)' }}>
                삭제
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={fileUploading}
              className="w-full h-16 rounded-xl flex items-center justify-center gap-2 btn-press"
              style={{ border: '1.5px dashed var(--border-secondary)', background: 'var(--surface-low)' }}>
              {fileUploading
                ? <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
                : <>
                    <span className="text-lg">📎</span>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>파일 첨부</p>
                  </>
              }
            </button>
          )}
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* 상단 고정 토글 */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>상단 고정</p>
          <button type="button" onClick={() => setIsPinned(!isPinned)}
            className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: isPinned ? 'var(--dku-blue-primary)' : 'var(--border-secondary)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isPinned ? '28px' : '4px' }} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </main>
  )
}