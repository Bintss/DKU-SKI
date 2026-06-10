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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)

    const fileName = `images/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('notices').upload(fileName, file)

    if (error) { alert('업로드 실패'); setImageUploading(false); return }

    const { data } = supabase.storage.from('notices').getPublicUrl(fileName)
    setImageUrl(data.publicUrl)
    setImageUploading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true)

    const uploadName = `files/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('notices').upload(uploadName, file)

    if (error) { alert('업로드 실패'); setFileUploading(false); return }

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
      title,
      content,
      is_pinned: isPinned,
      image_url: imageUrl || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      author_id: user.id,
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    router.push('/notices')
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">공지 작성</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 제목 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">제목</label>
          <input
            type="text"
            placeholder="공지 제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>

        {/* 본문 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">내용</label>
          <textarea
            placeholder="공지 내용을 입력해주세요"
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
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>

        {/* 파일 첨부 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">파일 첨부 (선택)</label>
          {fileUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--gray-50)' }}
            >
              <span className="text-xl">📎</span>
              <p className="text-sm text-gray-700 flex-1 truncate">{fileName}</p>
              <button
                type="button"
                onClick={() => { setFileUrl(''); setFileName('') }}
                className="text-xs text-red-400 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileUploading}
              className="w-full h-16 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              style={{ borderColor: 'var(--gray-300)' }}
            >
              {fileUploading ? (
                <p className="text-sm text-gray-400">업로드 중...</p>
              ) : (
                <>
                  <span className="text-lg">📎</span>
                  <p className="text-sm text-gray-400">파일 첨부</p>
                </>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* 고정 여부 */}
<div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
  <span className="text-sm text-gray-700">상단 고정</span>
  <button
    type="button"
    onClick={() => setIsPinned(!isPinned)}
    className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
    style={{ background: isPinned ? 'var(--ski-blue)' : 'var(--gray-200)' }}
  >
    <span
      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
      style={{ left: isPinned ? '28px' : '4px' }}
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
          {submitting ? '등록 중...' : '공지 등록'}
        </button>
      </form>
    </main>
  )
}