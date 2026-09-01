import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import {
  ClubAccountingCategory,
  ClubAccountingEntryType,
  type ClubAccountingEntryDto,
  type ClubAccountingListResponse,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

type AccountingPeriod = 'THIS_MONTH' | 'THIS_YEAR' | 'ALL';

export function ClubAccountingScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [period, setPeriod] = useState<AccountingPeriod>('THIS_YEAR');
  const [data, setData] = useState<ClubAccountingListResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [editing, setEditing] = useState<ClubAccountingEntryDto | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');

  const load = useCallback(async () => {
    if (!clubId) return;
    setData(await api.listClubAccounting(clubId, period));
  }, [api, clubId, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const inputStyle = {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderColor: theme.colors.border.subtle,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface.card,
  };

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
      <Stack gap="md">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
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
              <Text>현재 잔액 {data.summary.balance}원</Text>
              <Text variant="caption" tone="secondary">
                올해 수입 {data.summary.incomeThisYear} · 지출 {data.summary.expenseThisYear}
              </Text>
            </Stack>
          </Card>
        ) : null}

        <Text variant="sectionTitle">장부</Text>
        {data?.items.map((entry) => (
          <Card key={entry.id} padding="sm">
            <Stack gap="xs">
              <Text variant="body">
                {entry.entryDate} · {entry.entryType === 'INCOME' ? '수입' : '지출'} · {entry.amount}
              </Text>
              {entry.memo ? (
                <Text variant="caption" tone="secondary">
                  {entry.memo}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="수정" size="sm" variant="secondary" onPress={() => startEdit(entry)} />
                <Button label="삭제" size="sm" variant="secondary" onPress={() => confirmDelete(entry.id)} />
              </View>
            </Stack>
          </Card>
        ))}

        {editing ? (
          <Card padding="md">
            <Stack gap="sm">
              <Text variant="sectionTitle">장부 수정</Text>
              <TextInput value={editAmount} onChangeText={setEditAmount} keyboardType="number-pad" style={inputStyle} />
              <TextInput value={editMemo} onChangeText={setEditMemo} placeholder="메모" style={inputStyle} />
              <Button label="저장" size="sm" onPress={() => void saveEdit()} />
              <Button label="취소" size="sm" variant="secondary" onPress={() => setEditing(null)} />
            </Stack>
          </Card>
        ) : null}

        <Text variant="sectionTitle">수입 등록</Text>
        <TextInput value={amount} onChangeText={setAmount} placeholder="금액" keyboardType="number-pad" style={inputStyle} />
        <TextInput value={memo} onChangeText={setMemo} placeholder="메모" style={inputStyle} />
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
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({});
