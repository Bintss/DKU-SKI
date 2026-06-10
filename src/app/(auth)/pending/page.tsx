export default function PendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-lg font-semibold mb-2">승인 대기 중</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          가입 신청이 완료됐어요.<br />
          운영진 승인 후 이용 가능합니다.<br />
          승인까지 1~2일 소요될 수 있어요.
        </p>
      </div>
    </main>
  )
}