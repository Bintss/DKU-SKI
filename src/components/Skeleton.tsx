export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1">
          <div className="h-3 rounded-full w-24 mb-2"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 rounded-full w-16"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>
      <div className="h-4 rounded-full w-3/4 mb-2"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3 rounded-full w-full mb-1.5"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3 rounded-full w-2/3"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div className="animate-pulse px-4">
      <div className="rounded-2xl h-40 mb-5"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
      >
        <div className="h-3 rounded-full w-20 mb-4"
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        {[1,2,3].map(i => (
          <div key={i} className="flex justify-between py-2.5 border-b last:border-0"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="h-3 rounded-full w-16"
              style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-3 rounded-full w-24"
              style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonNotice({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 animate-pulse"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
        >
          <div className="h-4 rounded-full w-2/3 mb-2"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 rounded-full w-full mb-1.5"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex justify-between mt-3">
            <div className="h-3 rounded-full w-16"
              style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-3 rounded-full w-12"
              style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonHome() {
  return (
    <div className="animate-pulse px-4">
      <div className="rounded-2xl h-28 mb-4"
        style={{ background: 'rgba(27,63,171,0.2)' }} />
      <div className="rounded-2xl h-24 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }} />
      <div className="rounded-2xl h-20 mb-5"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }} />
      <div className="grid grid-cols-4 gap-2.5">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl h-20"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }} />
        ))}
      </div>
    </div>
  )
}