import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Chip, Input, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import {
  STORE_SCREEN_BRANDS,
  formatStoreScreenBrandLabel,
} from '@jjoin/domain';
import type {
  StoreOperatingHoursInput,
  StorePriceSlotInput,
  StoreProfileDto,
  StoreProfileVisibility,
  StoreScreenBrand,
} from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';
import { StoreOperatingHoursEditor } from '../../src/features/store-profile/components/StoreOperatingHoursEditor';
import { StoreOwnerPhotoEditor } from '../../src/features/store-profile/components/StoreOwnerPhotoEditor';
import { StorePriceSlotEditor } from '../../src/features/store-profile/components/StorePriceSlotEditor';

export default function StoreProfileEditScreen() {
  const { ownershipId } = useLocalSearchParams<{ ownershipId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const sessionStore = useMemo(() => getSecureSessionStore(), []);
  const [profile, setProfile] = useState<StoreProfileDto | null>(null);
  const [operatingHours, setOperatingHours] = useState<StoreOperatingHoursInput[]>([]);
  const [priceSlots, setPriceSlots] = useState<StorePriceSlotInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ownershipId) return;
    try {
      const next = await api.getMyStoreProfile(ownershipId);
      setProfile(next);
      setOperatingHours(next.operatingHours);
      setPriceSlots(next.priceSlots);
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

  async function save() {
    if (!ownershipId || !profile) return;
    const current = profile;
    setBusy(true);
    try {
      setProfile(
        await api.upsertMyStoreProfile(ownershipId, {
          intro: current.intro,
          screenBrand: current.screenBrand,
          screenBrandOther: current.screenBrandOther,
          screenModel: current.screenModel,
          roomCount: current.roomCount,
          phone: current.phone,
          reservationLabel: current.reservationLabel,
          reservationUrl: current.reservationUrl,
          reservationNote: current.reservationNote,
          parkingAvailable: current.parkingAvailable,
          parkingNote: current.parkingNote,
          leftHandedAvailable: current.leftHandedAvailable,
          unmanned: current.unmanned,
          visibility: current.visibility,
          operatingHours,
          priceSlots,
        }),
      );
      setError(null);
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="screenTitle">{profile.name}</Text>
      <Text tone="secondary">{profile.regionLabel}</Text>
      <Spacer size="md" />

      <StoreOwnerPhotoEditor
        ownershipId={ownershipId!}
        profile={profile}
        getAccessToken={() => sessionStore.getToken()}
        onUpdated={setProfile}
        onDeletePhoto={async (photoId) => {
          setProfile(await api.deleteMyStoreProfilePhoto(ownershipId!, photoId));
        }}
        onSetCover={async (photoId) => {
          setProfile(await api.setMyStoreCoverPhoto(ownershipId!, photoId));
        }}
      />

      <Spacer size="md" />
      <Input
        label="매장 소개"
        value={profile.intro ?? ''}
        onChangeText={(intro) => setProfile({ ...profile, intro })}
        multiline
      />
      <Spacer size="sm" />
      <Input
        label="전화번호"
        value={profile.phone ?? ''}
        onChangeText={(phone) => setProfile({ ...profile, phone })}
        keyboardType="phone-pad"
      />
      <Spacer size="sm" />
      <Input
        label="예약 안내명 (URL 있을 때 버튼명)"
        value={profile.reservationLabel ?? ''}
        onChangeText={(reservationLabel) => setProfile({ ...profile, reservationLabel })}
      />
      <Spacer size="sm" />
      <Input
        label="외부 예약 URL"
        value={profile.reservationUrl ?? ''}
        onChangeText={(reservationUrl) => setProfile({ ...profile, reservationUrl })}
        autoCapitalize="none"
      />
      <Spacer size="sm" />
      <Input
        label="예약 안내 (URL 없을 때 표시)"
        value={profile.reservationNote ?? ''}
        onChangeText={(reservationNote) => setProfile({ ...profile, reservationNote })}
        multiline
      />

      <Spacer size="md" />
      <StoreOperatingHoursEditor rows={operatingHours} onChange={setOperatingHours} />

      <Spacer size="md" />
      <StorePriceSlotEditor slots={priceSlots} onChange={setPriceSlots} />

      <Spacer size="md" />
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
      <Input
        label="스크린 기기 모델"
        value={profile.screenModel ?? ''}
        onChangeText={(screenModel) => setProfile({ ...profile, screenModel })}
      />
      <Spacer size="sm" />
      <Input
        label="룸 수"
        value={profile.roomCount != null ? String(profile.roomCount) : ''}
        keyboardType="number-pad"
        onChangeText={(raw) =>
          setProfile({ ...profile, roomCount: raw ? Number(raw.replace(/[^\d]/g, '')) : null })
        }
      />
      <Spacer size="sm" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          label="주차 가능"
          selected={Boolean(profile.parkingAvailable)}
          onPress={() => setProfile({ ...profile, parkingAvailable: !profile.parkingAvailable })}
        />
        <Chip
          label="좌타석"
          selected={Boolean(profile.leftHandedAvailable)}
          onPress={() => setProfile({ ...profile, leftHandedAvailable: !profile.leftHandedAvailable })}
        />
        <Chip
          label="무인 운영"
          selected={Boolean(profile.unmanned)}
          onPress={() => setProfile({ ...profile, unmanned: !profile.unmanned })}
        />
      </View>
      {profile.parkingAvailable ? (
        <>
          <Spacer size="sm" />
          <Input
            label="주차 안내"
            value={profile.parkingNote ?? ''}
            onChangeText={(parkingNote) => setProfile({ ...profile, parkingNote })}
          />
        </>
      ) : null}

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
