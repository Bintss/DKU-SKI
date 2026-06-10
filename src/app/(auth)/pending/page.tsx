export default function PendingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--gray-50)' }}
    >
      <img
        src="/icon-192x192.png"
        alt="단국대 스키부"
        className="w-20 h-20 rounded-2xl shadow-md mb-6 opacity-60"
      />
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">승인 대기 중</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          가입 신청이 완료됐어요.<br />
          운영진 승인 후 이용 가능합니다.<br />
          승인까지 1~2일 소요될 수 있어요.
        </p>
      </div>
      <a
        href="/login"
        className="mt-8 text-sm hover:underline"
        style={{ color: 'var(--ski-blue)' }}
      >
        로그인 페이지로
      </a>
    </main>
  )
}