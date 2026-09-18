import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Chip, Input, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import {
  STORE_AMENITY_PRESETS,
  STORE_SCREEN_BRANDS,
  formatStoreAmenityLabel,
  formatStoreScreenBrandLabel,
} from '@jjoin/domain';
import type { StoreProfileDto, StoreProfileVisibility, StoreScreenBrand } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

export default function StoreProfileEditScreen() {
  const { ownershipId } = useLocalSearchParams<{ ownershipId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [profile, setProfile] = useState<StoreProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ownershipId) return;
    try {
      setProfile(await api.getMyStoreProfile(ownershipId));
      setError(null);
    } catch {
      setError('매장 프로필을 불러오지 못했습니다.');
    }
  }, [api, ownershipId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text>{error ?? '불러오는 중…'}</Text>
      </ScrollScreenFrame>
    );
  }

  const current = profile;

  async function save() {
    if (!ownershipId) return;
    setBusy(true);
    try {
      setProfile(
        await api.upsertMyStoreProfile(ownershipId, {
          intro: current.intro,
          vibe: current.vibe,
          amenities: current.amenities,
          screenBrand: current.screenBrand,
          screenBrandOther: current.screenBrandOther,
          visibility: current.visibility,
        }),
      );
      setError(null);
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function toggleAmenity(code: string) {
    setProfile({
      ...current,
      amenities: current.amenities.includes(code)
        ? current.amenities.filter((item) => item !== code)
        : [...current.amenities, code],
    });
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="screenTitle">{profile.name}</Text>
      <Text tone="secondary">{profile.regionLabel}</Text>
      <Spacer size="md" />
      <Input
        label="소개"
        value={profile.intro ?? ''}
        onChangeText={(intro) => setProfile({ ...profile, intro })}
        multiline
      />
      <Spacer size="sm" />
      <Input
        label="분위기"
        value={profile.vibe ?? ''}
        onChangeText={(vibe) => setProfile({ ...profile, vibe })}
      />
      <Spacer size="sm" />
      <Text variant="label">스크린 브랜드</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {STORE_SCREEN_BRANDS.map((brand) => (
          <Chip
            key={brand}
            label={formatStoreScreenBrandLabel(brand)}
            selected={profile.screenBrand === brand}
            onPress={() => setProfile({ ...profile, screenBrand: brand as StoreScreenBrand })}
          />
        ))}
      </View>
      {profile.screenBrand === 'OTHER' ? (
        <>
          <Spacer size="sm" />
          <Input
            label="기타 브랜드명"
            value={profile.screenBrandOther ?? ''}
            onChangeText={(screenBrandOther) => setProfile({ ...profile, screenBrandOther })}
          />
        </>
      ) : null}
      <Spacer size="sm" />
      <Text variant="label">편의시설</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {STORE_AMENITY_PRESETS.map((code) => (
          <Chip
            key={code}
            label={formatStoreAmenityLabel(code)}
            selected={profile.amenities.includes(code)}
            onPress={() => toggleAmenity(code)}
          />
        ))}
      </View>
      <Spacer size="sm" />
      <Text variant="label">공개</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {(['PUBLIC', 'PRIVATE'] as StoreProfileVisibility[]).map((visibility) => (
          <Chip
            key={visibility}
            label={visibility === 'PUBLIC' ? '공개' : '비공개'}
            selected={profile.visibility === visibility}
            onPress={() => setProfile({ ...profile, visibility })}
          />
        ))}
      </View>
      {error ? <Text tone="error">{error}</Text> : null}
      <Spacer size="md" />
      <Button label="저장" loading={busy} onPress={() => void save()} />
    </ScrollScreenFrame>
  );
}
