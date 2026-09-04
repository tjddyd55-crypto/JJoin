import { useCallback, useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  ClubEmptyState,
  ClubSection,
  ScrollScreenFrame,
  Stack,
  Text,
} from '@jjoin/design-system';
import {
  ClubAccountingCategory,
  ClubAccountingEntryType,
  type ClubAccountingEntryDto,
  type ClubAccountingListResponse,
} from '@jjoin/types';
import { ClubFormField, ClubFormSection, CLUB_SECTION_GAP } from '../components/ClubFormSection';
import { clubFormStyles, useClubInputStyle } from '../components/club-form-styles';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

type AccountingPeriod = 'THIS_MONTH' | 'THIS_YEAR' | 'ALL';

function formatAmount(amount: string, entryType: ClubAccountingEntryType) {
  const prefix = entryType === ClubAccountingEntryType.INCOME ? '+' : '-';
  return `${prefix}${amount}원`;
}

export function ClubAccountingScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [period, setPeriod] = useState<AccountingPeriod>('THIS_YEAR');
  const [data, setData] = useState<ClubAccountingListResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [editing, setEditing] = useState<ClubAccountingEntryDto | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const inputStyle = useClubInputStyle();

  const load = useCallback(async () => {
    if (!clubId) return;
    setData(await api.listClubAccounting(clubId, period));
  }, [api, clubId, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const startEdit = (entry: ClubAccountingEntryDto) => {
    setEditing(entry);
    setEditAmount(entry.amount);
    setEditMemo(entry.memo ?? '');
  };

  const saveEdit = async () => {
    if (!clubId || !editing) return;
    await api.updateClubAccountingEntry(clubId, editing.id, {
      amount: editAmount,
      memo: editMemo || null,
    });
    setEditing(null);
    await load();
  };

  const confirmDelete = (entryId: string) => {
    Alert.alert('장부 삭제', '이 항목을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void api.deleteClubAccountingEntry(clubId!, entryId).then(load),
      },
    ]);
  };

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md" style={{ gap: CLUB_SECTION_GAP }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['THIS_MONTH', '이번 달'],
              ['THIS_YEAR', '올해'],
              ['ALL', '전체'],
            ] as const
          ).map(([value, label]) => (
            <Chip key={value} label={label} selected={period === value} onPress={() => setPeriod(value)} />
          ))}
        </View>

        {data ? (
          <Card padding="md">
            <Stack gap="xs">
              <Text variant="joinSectionTitle">현재 잔액</Text>
              <Text variant="bodyStrong">{data.summary.balance}원</Text>
              <Text variant="clubMeta" tone="tertiary">
                올해 수입 {data.summary.incomeThisYear} · 지출 {data.summary.expenseThisYear}
              </Text>
            </Stack>
          </Card>
        ) : null}

        <ClubSection title="수입·지출 내역">
          {data?.items.map((entry) => (
            <Card key={entry.id} padding="md">
              <Stack gap="xs">
                <Text variant="bodyStrong">
                  {formatAmount(entry.amount, entry.entryType)}
                </Text>
                <Text variant="clubMeta" tone="secondary">
                  {entry.entryDate} · {entry.entryType === ClubAccountingEntryType.INCOME ? '수입' : '지출'}
                </Text>
                {entry.memo ? (
                  <Text variant="clubMeta" tone="tertiary">{entry.memo}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="수정" size="sm" variant="secondary" onPress={() => startEdit(entry)} />
                  <Button label="삭제" size="sm" variant="danger" onPress={() => confirmDelete(entry.id)} />
                </View>
              </Stack>
            </Card>
          ))}
          {data && data.items.length === 0 ? (
            <ClubEmptyState title="내역이 없습니다" description="수입·지출을 등록해 보세요." />
          ) : null}
        </ClubSection>

        {editing ? (
          <ClubFormSection title="장부 수정">
            <ClubFormField label="금액">
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="number-pad"
                style={inputStyle}
              />
            </ClubFormField>
            <ClubFormField label="메모">
              <TextInput value={editMemo} onChangeText={setEditMemo} placeholder="메모" style={inputStyle} />
            </ClubFormField>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="저장" size="sm" onPress={() => void saveEdit()} />
              <Button label="취소" size="sm" variant="secondary" onPress={() => setEditing(null)} />
            </View>
          </ClubFormSection>
        ) : null}

        <ClubFormSection title="내역 등록">
          <ClubFormField label="금액">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="금액"
              keyboardType="number-pad"
              style={inputStyle}
            />
          </ClubFormField>
          <ClubFormField label="메모">
            <TextInput value={memo} onChangeText={setMemo} placeholder="메모" style={inputStyle} />
          </ClubFormField>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="수입 추가"
              size="sm"
              onPress={() =>
                void api
                  .createClubAccountingEntry(clubId!, {
                    entryType: ClubAccountingEntryType.INCOME,
                    category: ClubAccountingCategory.MEMBERSHIP_FEE,
                    amount,
                    entryDate: new Date().toISOString().slice(0, 10),
                    memo: memo || null,
                  })
                  .then(() => {
                    setAmount('');
                    setMemo('');
                    return load();
                  })
              }
            />
            <Button
              label="지출 추가"
              size="sm"
              variant="secondary"
              onPress={() =>
                void api
                  .createClubAccountingEntry(clubId!, {
                    entryType: ClubAccountingEntryType.EXPENSE,
                    category: ClubAccountingCategory.GAME_FEE,
                    amount,
                    entryDate: new Date().toISOString().slice(0, 10),
                    memo: memo || null,
                  })
                  .then(() => {
                    setAmount('');
                    setMemo('');
                    return load();
                  })
              }
            />
          </View>
        </ClubFormSection>
      </Stack>
    </ScrollScreenFrame>
  );
}
