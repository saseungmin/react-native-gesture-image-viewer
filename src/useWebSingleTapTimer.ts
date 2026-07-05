import { useCallback } from 'react';

export type ScheduleWebSingleTap = (callback: () => void, delay?: number) => void;

export function useWebSingleTapTimer() {
  const clearPendingWebSingleTap = useCallback(() => {}, []);
  const scheduleWebSingleTap = useCallback<ScheduleWebSingleTap>(() => {}, []);

  return { clearPendingWebSingleTap, scheduleWebSingleTap };
}
