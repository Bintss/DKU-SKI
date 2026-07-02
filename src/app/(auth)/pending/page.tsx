export default function PendingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--surface)' }}>

      <div className="w-full max-w-sm text-center">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl mx-auto mb-6"
          style={{ opacity: 0.5, boxShadow: 'var(--shadow-sm)' }}
        />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'var(--ski-blue-50)', border: '1px solid var(--dku-blue-light)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--dku-blue)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--dku-blue-primary)' }}>
            승인 대기 중
          </span>
        </div>

        <h1 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
          가입 신청 완료
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          운영진이 가입 신청을 확인하고 있어요.<br />
          승인 완료 후 서비스를 이용할 수 있어요.<br />
          보통 1~2일 이내에 처리돼요.
        </p>

        <div className="rounded-2xl p-4 mt-6 mb-8 text-left"
          style={{
            background: 'var(--surface-low)',
            border: '1px solid var(--border-primary)',
          }}>
          <p className="text-xs font-black mb-2" style={{ color: 'var(--text-tertiary)' }}>
            승인 절차 안내
          </p>
          {[
            { step: '1', text: '가입 신청 접수 완료' },
            { step: '2', text: '운영진 정보 확인 중' },
            { step: '3', text: '승인 후 이용 가능' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  background: i === 0 ? 'var(--dku-blue-primary)' : 'var(--border-primary)',
                  color: i === 0 ? '#fff' : 'var(--text-hint)',
                }}>
                {item.step}
              </span>
              <span className="text-sm"
                style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-hint)' }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <a href="/login"
          className="text-sm font-bold"
          style={{ color: 'var(--dku-blue)' }}>
          로그인 화면으로 돌아가기
        </a>
      </div>
    </main>
  )
}