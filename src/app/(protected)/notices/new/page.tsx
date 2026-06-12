'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewNoticePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    const uploadName = `images/${Date.now()}.${file.name.split('.').pop()}`
    await supabase.storage.from('notices').upload(uploadName, file)
    const { data } = supabase.storage.from('notices').getPublicUrl(uploadName)
    setImageUrl(data.publicUrl)
    setImageUploading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true)
    const uploadName = `files/${Date.now()}_${file.name}`
    await supabase.storage.from('notices').upload(uploadName, file)
    const { data } = supabase.storage.from('notices').getPublicUrl(uploadName)
    setFileUrl(data.publicUrl)
    setFileName(file.name)
    setFileUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('notices').insert({
      title, content, is_pinned: isPinned,
      image_url: imageUrl || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      author_id: user.id,
    })

    if (error) { setError(error.message); setSubmitting(false); return }
    router.push('/notices')
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Notice</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>공지 작성</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>제목</label>
          <input type="text" placeholder="공지 제목" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>내용</label>
          <textarea placeholder="공지 내용을 입력해주세요" value={content}
            onChange={e => setContent(e.target.value)} rows={8}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={inputStyle} required />
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
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                삭제
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="w-full h-28 rounded-xl flex flex-col items-center justify-center gap-2 btn-press"
              style={{
                border: '1px dashed var(--border-secondary)',
                background: 'var(--bg-card)',
              }}>
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

        {/* 파일 첨부 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>파일 첨부 (선택)</label>
          {fileUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
              <i className="ti ti-paperclip" style={{ fontSize: 18, color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <p className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{fileName}</p>
              <button type="button" onClick={() => { setFileUrl(''); setFileName('') }}
                className="text-xs font-black btn-press" style={{ color: '#FF6B6B' }}>삭제</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={fileUploading}
              className="w-full h-16 rounded-xl flex items-center justify-center gap-2 btn-press"
              style={{ border: '1px dashed var(--border-secondary)', background: 'var(--bg-card)' }}>
              {fileUploading ? (
                <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
              ) : (
                <>
                  <i className="ti ti-paperclip" style={{ fontSize: 18, color: 'var(--text-hint)' }} aria-hidden="true" />
                  <p className="text-sm" style={{ color: 'var(--text-hint)' }}>파일 첨부</p>
                </>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* 상단 고정 */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>상단 고정</p>
          </div>
          <button type="button" onClick={() => setIsPinned(!isPinned)}
            className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: isPinned ? 'var(--ski-blue)' : 'rgba(255,255,255,0.1)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isPinned ? '28px' : '4px' }} />
          </button>
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--ski-blue)' }}>
          {submitting ? '등록 중...' : '공지 등록'}
        </button>
      </form>
    </main>
  )
}