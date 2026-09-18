import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, FormScreenFrame, Input, Spacer, StickyActionFrame, Text } from '@jjoin/design-system';
import { coinGiftSchema } from '@jjoin/validation';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore, useSession } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

function newGiftKey() {
  return `gift-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CoinGiftScreen() {
  const { me } = useSession();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSend() {
    const parsed = coinGiftSchema.safeParse({
      toUserId: toUserId.trim(),
      amount: amount.trim(),
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
      router.back();
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      setError(text.includes('INSUFFICIENT') ? '사용 가능 코인이 부족합니다.' : '코인 선물에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label="선물하기" loading={busy} onPress={() => void onSend()} />
        </StickyActionFrame>
      }
    >
      <Text variant="body" tone="secondary">
        사용 가능 코인만 선물됩니다. 홀드 코인은 사용할 수 없고, 기존 월렛 원장으로 처리됩니다.
      </Text>
      <Spacer size="md" />
      <Input
        label="받는 사람 사용자 ID"
        value={toUserId}
        onChangeText={setToUserId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Spacer size="sm" />
      <Input
        label="금액"
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
