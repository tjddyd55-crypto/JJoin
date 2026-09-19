import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text, spacing, useTheme } from '@jjoin/design-system';
import {
  buildStoreFacilitySummary,
  formatKrwPrice,
  formatOperatingHoursLine,
  formatStorePriceDayTypeLabel,
  sortStorePriceSlots,
} from '@jjoin/domain';
import type { PublicStoreDetailDto, StoreProfileDto } from '@jjoin/types';
import { openStoreExternalUrl, openStorePhoneDialer } from '../open-store-external-link';

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />;
}

type ProfileLike = Pick<
  StoreProfileDto,
  | 'intro'
  | 'operatingHours'
  | 'priceSlots'
  | 'screenBrand'
  | 'screenBrandOther'
  | 'screenModel'
  | 'roomCount'
  | 'parkingAvailable'
  | 'parkingNote'
  | 'leftHandedAvailable'
  | 'unmanned'
  | 'reservationLabel'
  | 'reservationUrl'
  | 'reservationNote'
  | 'phone'
  | 'address'
  | 'regionLabel'
>;

export function StoreProfileHeader({
  store,
  onCall,
  onReserve,
}: {
  store: ProfileLike & { name: string };
  onCall?: () => void;
  onReserve?: () => void;
}) {
  const hasPhone = Boolean(store.phone?.trim());
  const hasReservationUrl = Boolean(store.reservationUrl?.trim());

  return (
    <View style={styles.section}>
      <Text variant="screenTitle">{store.name}</Text>
      <Text tone="secondary">{[store.address, store.regionLabel].filter(Boolean).join(' · ')}</Text>
      <View style={styles.actions}>
        {hasPhone ? (
          <Button
            label="전화하기"
            variant="secondary"
            onPress={
              onCall ??
              (() => {
                void openStorePhoneDialer(store.phone ?? '');
              })
            }
          />
        ) : null}
        {hasReservationUrl ? (
          <Button
            label={store.reservationLabel?.trim() || '예약하기'}
            onPress={
              onReserve ??
              (() => {
                void openStoreExternalUrl(store.reservationUrl ?? '').then((ok) => {
                  if (!ok) Alert.alert('예약 링크를 열 수 없습니다.');
                });
              })
            }
          />
        ) : null}
      </View>
    </View>
  );
}

export function StoreProfileBody({ store }: { store: ProfileLike }) {
  const facilityLines = buildStoreFacilitySummary(store);
  const priceSlots = sortStorePriceSlots(store.priceSlots ?? []);
  const priceGroups = ['WEEKDAY', 'WEEKEND', 'ALL'] as const;

  return (
    <View style={styles.body}>
      {store.intro ? (
        <>
          <Text variant="sectionTitle">매장 소개</Text>
          <Text>{store.intro}</Text>
          <Divider />
        </>
      ) : null}

      {store.operatingHours.length > 0 ? (
        <>
          <Text variant="sectionTitle">운영시간</Text>
          {store.operatingHours.map((row) => (
            <Text key={row.id}>{formatOperatingHoursLine(row)}</Text>
          ))}
          <Divider />
        </>
      ) : null}

      {priceSlots.length > 0 ? (
        <>
          <Text variant="sectionTitle">이용요금</Text>
          {priceGroups.map((dayType) => {
            const rows = priceSlots.filter((slot) => slot.dayType === dayType);
            if (rows.length === 0) return null;
            return (
              <View key={dayType} style={styles.priceGroup}>
                <Text variant="label">{formatStorePriceDayTypeLabel(dayType)}</Text>
                {rows.map((slot) => (
                  <View key={slot.id} style={styles.priceRow}>
                    <Text tone="secondary" style={styles.priceTime}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                    <Text style={styles.priceValue}>{formatKrwPrice(slot.price)}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          <Divider />
        </>
      ) : null}

      {facilityLines.length > 0 ? (
        <>
          <Text variant="sectionTitle">매장 정보</Text>
          <Text>{facilityLines.join(' · ')}</Text>
          <Divider />
        </>
      ) : null}

      {!store.reservationUrl?.trim() && store.reservationNote?.trim() ? (
        <>
          <Text variant="sectionTitle">예약 안내</Text>
          <Text>{store.reservationNote}</Text>
          <Divider />
        </>
      ) : null}
    </View>
  );
}

export function StoreJoinCta({
  store,
  onPress,
}: {
  store: PublicStoreDetailDto;
  onPress: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="sectionTitle">이 매장의 조인</Text>
      <Button label="이 매장에서 조인 만들기" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  body: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  priceGroup: { gap: 6, marginTop: spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceTime: { flex: 1, flexShrink: 1 },
  priceValue: { minWidth: 88, textAlign: 'right' },
});
