import { useEffect, useRef } from 'react'

/**
 * 페이지가 다시 보여질 때(뒤로가기, 탭 전환, 앱 포그라운드 복귀 등)
 * 전달된 콜백을 재실행하는 훅.
 *
 * visibilitychange, focus, pageshow 세 이벤트를 한 번에 처리하며
 * 짧은 시간 내 중복 호출은 자동으로 무시한다.
 */
export function usePageVisibilityRefetch(
  callback: () => void,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 1000, enabled = true } = options
  const lastCallRef = useRef(0)
  const callbackRef = useRef(callback)

  // 최신 콜백을 항상 참조하도록 유지 (의존성 배열에 callback을 안 넣어도 안전)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const trigger = () => {
      const now = Date.now()
      if (now - lastCallRef.current < debounceMs) return
      lastCallRef.current = now
      callbackRef.current()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') trigger()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', trigger)
    window.addEventListener('pageshow', trigger)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', trigger)
      window.removeEventListener('pageshow', trigger)
    }
  }, [enabled, debounceMs])
}