import * as SecureStore from 'expo-secure-store';
import type { JoinDiscoveryRegion } from '@jjoin/domain';

const RECENT_REGION_KEY = 'jjoin.discovery.recentRegion.v1';

export async function loadRecentDiscoveryRegion(): Promise<JoinDiscoveryRegion | null> {
  try {
    const raw = await SecureStore.getItemAsync(RECENT_REGION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JoinDiscoveryRegion;
    if (parsed?.mode === 'NEARBY') {
      return { mode: 'NEARBY', label: parsed.label || '내 주변' };
    }
    if (
      parsed?.mode === 'DISTRICT' &&
      typeof parsed.sido === 'string' &&
      typeof parsed.sigungu === 'string'
    ) {
      return {
        mode: 'DISTRICT',
        sido: parsed.sido,
        sigungu: parsed.sigungu,
        label: parsed.label || parsed.sigungu,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveRecentDiscoveryRegion(
  region: JoinDiscoveryRegion,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(RECENT_REGION_KEY, JSON.stringify(region));
  } catch {
    // non-fatal preference write
  }
}
