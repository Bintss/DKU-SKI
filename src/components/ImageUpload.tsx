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
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
            삭제
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 btn-press"
          style={{
            border: '1px dashed var(--border-secondary)',
            background: 'var(--bg-card)',
          }}>
          {uploading ? (
            <p className="text-sm" style={{ color: 'var(--text-hint)' }}>업로드 중...</p>
          ) : (
            <>
              <i className="ti ti-photo" style={{ fontSize: 28, color: 'var(--text-hint)' }} aria-hidden="true" />
              <p className="text-sm" style={{ color: 'var(--text-hint)' }}>사진 추가</p>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>JPG, PNG, WEBP</p>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*"
        onChange={handleUpload} className="hidden" />
    </div>
  )
}