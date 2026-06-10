'use client'

import { useState } from 'react'
import Drawer from './Drawer'

export default function Header({ title }: { title?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 px-4 flex items-center h-14"
        style={{ background: 'var(--ski-blue)' }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-white/10 transition-colors"
        >
          <span className="w-5 h-0.5 bg-white rounded-full block"></span>
          <span className="w-5 h-0.5 bg-white rounded-full block"></span>
          <span className="w-3 h-0.5 bg-white rounded-full block self-start ml-0"></span>
        </button>

        {title && (
          <h1 className="text-white font-semibold text-base ml-3">{title}</h1>
        )}

        <div className="ml-auto">
          <img src="/icon-192x192.png" alt="로고" className="w-7 h-7 rounded-lg opacity-90" />
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 헤더 높이만큼 여백 */}
      <div className="h-14" />
    </>
  )
}