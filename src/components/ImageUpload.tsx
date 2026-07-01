'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function ImageUpload({
  bucket,
  value,
  onChange,
}: {
  bucket: string
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from(bucket).upload(fileName, file, { upsert: true })

    if (error) { alert('업로드 실패: ' + error.message); setUploading(false); return }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    onChange(data.publicUrl)
    setUploading(false)
  }

  const handleRemove = async () => {
    if (!value) return
    const fileName = value.split('/').pop()
    if (fileName) await supabase.storage.from(bucket).remove([fileName])
    onChange('')
  }

  return (
    <div>
      {value ? (
        <div className="relative">
          <img src={value} alt="업로드된 이미지"
            className="w-full h-48 object-cover rounded-xl" />
          <button type="button" onClick={handleRemove}
            className="absolute top-2 right-2 text-xs font-black px-2.5 py-1.5 rounded-lg btn-press"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
            삭제
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 btn-press transition-colors"
          style={{
            border: '1.5px dashed var(--border-secondary)',
            background: 'var(--surface-low)',
          }}>
          {uploading ? (
            <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-hint)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
                사진 추가
              </p>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                JPG, PNG, WEBP
              </p>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*"
        onChange={handleUpload} className="hidden" />
    </div>
  )
}