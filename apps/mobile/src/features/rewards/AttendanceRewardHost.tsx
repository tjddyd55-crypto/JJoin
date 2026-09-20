import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@jjoin/design-system';
import { AuthAppState, type AttendanceCheckInDto, type RewardToastDto } from '@jjoin/types';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore, useSessionOptional } from '../../session/SessionContext';

const TOAST_MS = 3200;

/**
 * App-entry attendance ping. Must not block navigation or splash.
 * Soft toast only when the server granted attendance or a milestone.
 */
export function AttendanceRewardHost() {
  const session = useSessionOptional();
  const theme = useTheme();
  const pingedDate = useRef<string | null>(null);
  const pinging = useRef(false);
  const [toast, setToast] = useState<RewardToastDto | null>(null);
  const ready =
    session?.appState === AuthAppState.READY &&
    !session.bootstrapping &&
    Boolean(session.me?.userId);

  useEffect(() => {
    if (!ready || !session?.me?.userId) return;

    const run = () => {
      if (pinging.current) return;
      pinging.current = true;
      const api = getApiClient(getSecureSessionStore());
      void api
        .pingAttendance()
        .then((result) => {
          if (pingedDate.current === result.kstDate && !result.granted) return;
          pingedDate.current = result.kstDate;
          const nextToast = pickRewardToast(result);
          if (nextToast) setToast(nextToast);
        })
        .catch(() => undefined)
        .finally(() => {
          pinging.current = false;
        });
    };

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [ready, session?.me?.userId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surface.elevated,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        <Text variant="bodyStrong">{toast.title}</Text>
        <Text variant="caption" tone="secondary">
          {toast.body}
        </Text>
      </View>
    </View>
  );
}

function pickRewardToast(result: AttendanceCheckInDto): RewardToastDto | null {
  if (result.toast) return result.toast;
  return result.newlyGrantedMilestones[0]?.toast ?? null;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 56,
    zIndex: 40,
  },
  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
});
