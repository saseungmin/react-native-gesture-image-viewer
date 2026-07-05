import { useCallback, useEffect, useRef } from 'react';

export type ScheduleWebSingleTap = (callback: () => void, delay?: number) => void;

export function useWebSingleTapTimer() {
  const webSingleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingWebSingleTap = useCallback(() => {
    if (webSingleTapTimerRef.current) {
      clearTimeout(webSingleTapTimerRef.current);
      webSingleTapTimerRef.current = null;
    }
  }, []);

  const scheduleWebSingleTap = useCallback<ScheduleWebSingleTap>(
    (callback, delay = 250) => {
      clearPendingWebSingleTap();

      webSingleTapTimerRef.current = setTimeout(() => {
        callback();
        webSingleTapTimerRef.current = null;
      }, delay);
    },
    [clearPendingWebSingleTap],
  );

  useEffect(() => clearPendingWebSingleTap, [clearPendingWebSingleTap]);

  return { clearPendingWebSingleTap, scheduleWebSingleTap };
}
