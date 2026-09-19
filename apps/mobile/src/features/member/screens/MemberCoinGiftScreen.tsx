import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, FormScreenFrame, Input, Spacer, StickyActionFrame, Text } from '@jjoin/design-system';
import { coinGiftSchema } from '@jjoin/validation';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const QUICK_AMOUNTS = ['100', '300', '500', '1000'] as const;

function newGiftKey() {
  return `gift-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function MemberCoinGiftScreen() {
  const { userId, nickname } = useLocalSearchParams<{ userId: string; nickname?: string }>();
  const { me } = useSession();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [amount, setAmount] = useState('500');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const available = me?.walletSummary?.availableCoin ?? '0';
  const giftEnabled = me?.featureFlags?.coinGiftEnabled !== false;
  const displayName = nickname?.trim() || '회원';

  async function send(confirmedAmount: string) {
    if (!userId) {
      setError('받는 사람을 확인할 수 없습니다.');
      return;
    }
    if (!giftEnabled) {
      setError('코인 선물이 비활성화되어 있습니다.');
      return;
    }
    const parsed = coinGiftSchema.safeParse({
      toUserId: userId,
      amount: confirmedAmount.trim(),
      idempotencyKey: newGiftKey(),
      message: message.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.');
      return;
    }
    if (parsed.data.toUserId === me?.userId) {
      setError('자기 자신에게는 선물할 수 없습니다.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.sendCoinGift(parsed.data);
      Alert.alert('선물 완료', `${displayName}님에게 ${parsed.data.amount} C를 보냈습니다.`, [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      if (text.includes('coin_gift_disabled')) setError('코인 선물이 비활성화되어 있습니다.');
      else if (text.includes('self_gift')) setError('자기 자신에게는 선물할 수 없습니다.');
      else if (text.includes('INSUFFICIENT') || text.includes('insufficient')) {
        setError('사용 가능 코인이 부족합니다.');
      } else {
        setError('코인 선물에 실패했습니다.');
      }
    } finally {
      setBusy(false);
    }
  }

  function onConfirm() {
    Alert.alert('코인 선물', `${displayName}님에게 ${amount.trim() || '0'} C를 선물할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '보내기', onPress: () => void send(amount) },
    ]);
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button
            label="선물하기"
            loading={busy}
            disabled={!giftEnabled}
            onPress={onConfirm}
          />
        </StickyActionFrame>
      }
    >
      <Text variant="body" tone="secondary">
        받는 사람은 카드에서 고정됩니다. 사용자 ID를 직접 입력하지 않습니다.
      </Text>
      <Spacer size="md" />
      <Text variant="label" tone="secondary">
        받는 사람
      </Text>
      <Text variant="bodyStrong">{displayName}</Text>
      <Spacer size="sm" />
      <Text variant="label" tone="secondary">
        사용 가능 잔액
      </Text>
      <Text variant="bodyStrong">{available} C</Text>
      <Spacer size="md" />
      <Text variant="label" tone="secondary">
        빠른 금액
      </Text>
      <View style={styles.chips}>
        {QUICK_AMOUNTS.map((chip) => (
          <Pressable
            key={chip}
            accessibilityRole="button"
            onPress={() => setAmount(chip)}
            style={[styles.chip, amount === chip ? styles.chipActive : null]}
          >
            <Text variant="caption" tone="primary">
              {chip} C
            </Text>
          </Pressable>
        ))}
      </View>
      <Spacer size="sm" />
      <Input
        label="직접 입력"
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
        keyboardType="decimal-pad"
      />
      <Spacer size="sm" />
      <Input label="메시지 (선택)" value={message} onChangeText={setMessage} />
      {error ? (
        <>
          <Spacer size="sm" />
          <Text tone="error">{error}</Text>
        </>
      ) : null}
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { borderWidth: 2 },
});
