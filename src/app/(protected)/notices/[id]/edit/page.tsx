'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function EditNoticePage() {
  const { id } = useParams()
  const router = useRouter()
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
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchNotice = async () => {
      const { data } = await supabase.from('notices').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title)
        setContent(data.content)
        setIsPinned(data.is_pinned)
        setImageUrl(data.image_url ?? '')
        setFileUrl(data.file_url ?? '')
        setFileName(data.file_name ?? '')
      }
      setLoading(false)
    }
    fetchNotice()
  }, [id])

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

    await supabase.from('notices').update({
      title,
      content,
      is_pinned: isPinned,
      image_url: imageUrl || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id as string)

    router.push(`/notices/${id}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">공지 수정</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">제목</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">내용</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
            required
          />
        </div>

        {/* 이미지 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">이미지</label>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="미리보기" className="w-full h-48 object-cover rounded-xl" />
              <button type="button" onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-lg">
                삭제
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              style={{ borderColor: 'var(--gray-300)' }}
            >
              {imageUploading ? <p className="text-sm text-gray-400">업로드 중...</p> : (
                <><span className="text-2xl">📷</span><p className="text-sm text-gray-400">사진 추가</p></>
              )}
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>

        {/* 파일 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">파일 첨부</label>
          {fileUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--gray-50)' }}>
              <span className="text-xl">📎</span>
              <p className="text-sm text-gray-700 flex-1 truncate">{fileName}</p>
              <button type="button" onClick={() => { setFileUrl(''); setFileName('') }}
                className="text-xs text-red-400 hover:text-red-500">삭제</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={fileUploading}
              className="w-full h-16 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              style={{ borderColor: 'var(--gray-300)' }}
            >
              {fileUploading ? <p className="text-sm text-gray-400">업로드 중...</p> : (
                <><span className="text-lg">📎</span><p className="text-sm text-gray-400">파일 첨부</p></>
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--ski-blue)' }}
        >
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </main>
  )
}