'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OnlineStatusTracker() {
  useOnlineStatus();
  return null;
}
