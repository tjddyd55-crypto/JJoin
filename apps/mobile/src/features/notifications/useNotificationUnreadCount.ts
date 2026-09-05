import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore } from '../../session/SessionContext';

export function useNotificationUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const api = getApiClient(getSecureSessionStore());
      const { unreadCount: count } = await api.getNotificationUnreadCount();
      setUnreadCount(Math.max(0, count));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  return { unreadCount, refreshUnreadCount };
}
