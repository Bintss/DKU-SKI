export function SkeletonCard() {
  return (
    <div className="bg-white border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-gray-100 rounded-full w-24 mb-2" />
          <div className="h-3 bg-gray-100 rounded-full w-16" />
        </div>
      </div>
      <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded-full w-full mb-1.5" />
      <div className="h-3 bg-gray-100 rounded-full w-2/3" />
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
    <div className="animate-pulse">
      <div className="rounded-2xl p-6 mb-5 bg-gray-200 h-40" />
      <div className="bg-white border rounded-2xl p-5 mb-4">
        <div className="h-3 bg-gray-100 rounded-full w-20 mb-4" />
        {[1,2,3].map(i => (
          <div key={i} className="flex justify-between py-2.5 border-b last:border-0">
            <div className="h-3 bg-gray-100 rounded-full w-16" />
            <div className="h-3 bg-gray-100 rounded-full w-24" />
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
        <div key={i} className="bg-white border rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-gray-100 rounded-full w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded-full w-full mb-1.5" />
          <div className="flex justify-between mt-3">
            <div className="h-3 bg-gray-100 rounded-full w-16" />
            <div className="h-3 bg-gray-100 rounded-full w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonHome() {
  return (
    <div className="animate-pulse px-4">
      <div className="rounded-2xl h-28 bg-gray-200 mb-5" />
      <div className="rounded-2xl h-24 bg-gray-100 border mb-5" />
      <div className="rounded-2xl h-20 bg-gray-100 border mb-5" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl h-20 bg-gray-100 border" />
        ))}
      </div>
    </div>
  )
}