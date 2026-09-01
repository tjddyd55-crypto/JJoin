import { useCallback, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Button, Card, Chip, ScrollScreenFrame, Stack, Text, spacing } from '@jjoin/design-system';
import { formatAttendanceRateDisplay, isClubStaff } from '@jjoin/domain';
import {
  ClubMembershipRole,
  ClubMembershipStatus,
  type ClubMembershipDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

type MemberFilter = 'ALL' | 'STAFF' | 'MEMBER';

export function ClubMembersScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubMembershipDto[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('ALL');

  const load = useCallback(async () => {
    if (!clubId) return;
    const [members, detail] = await Promise.all([
      api.listClubMembers(clubId),
      api.getClubDetail(clubId),
    ]);
    setItems(members.items);
    setMyRole(detail.myRole);
  }, [api, clubId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const staff = myRole
    ? isClubStaff({ role: myRole, status: ClubMembershipStatus.ACTIVE })
    : false;
  const owner = myRole === ClubMembershipRole.OWNER;

  const pending = items.filter((m) => m.status === ClubMembershipStatus.PENDING);
  const filtered = items
    .filter((m) => m.status !== ClubMembershipStatus.PENDING)
    .filter((m) => {
      if (filter === 'STAFF') return m.role === ClubMembershipRole.OWNER || m.role === ClubMembershipRole.MANAGER;
      if (filter === 'MEMBER') return m.role === ClubMembershipRole.MEMBER;
      return true;
    })
    .filter((m) => !query.trim() || m.nickname.includes(query.trim()));

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        {staff && pending.length ? (
          <Card padding="md">
            <Text variant="bodyStrong">가입 대기 {pending.length}명</Text>
            <Stack gap="sm" style={{ marginTop: spacing.sm }}>
              {pending.map((member) => (
                <Card key={member.id} padding="sm">
                  <Stack gap="xs">
                    <Text variant="body">{member.nickname}</Text>
                    <Text variant="caption" tone="secondary">
                      신청일 {new Date(member.requestedAt).toLocaleDateString('ko-KR')}
                      {member.ageGroupLabel ? ` · ${member.ageGroupLabel}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button
                        label="승인"
                        size="sm"
                        onPress={() => void api.approveClubMember(clubId!, member.id).then(load)}
                      />
                      <Button
                        label="거절"
                        size="sm"
                        variant="secondary"
                        onPress={() => void api.rejectClubMember(clubId!, member.id).then(load)}
                      />
                    </View>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Card>
        ) : null}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="닉네임 검색"
          style={{ borderWidth: 1, borderRadius: 12, padding: spacing.sm }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {(['ALL', 'STAFF', 'MEMBER'] as const).map((value) => (
            <Chip
              key={value}
              label={value === 'ALL' ? '전체' : value === 'STAFF' ? '운영진' : '회원'}
              selected={filter === value}
              onPress={() => setFilter(value)}
            />
          ))}
        </View>

        {filtered.map((member) => (
          <Pressable
            key={member.id}
            onPress={() =>
              router.push(`/my/clubs/${clubId}/members/${member.userId}` as Href)
            }
          >
            <Card padding="md">
              <Stack gap="xs">
                <Text variant="bodyStrong">
                  {member.nickname} · {member.role}
                </Text>
                <Text variant="caption" tone="secondary">
                  가입일 {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ko-KR') : '-'}
                  {' · '}올해 참석률 {formatAttendanceRateDisplay(member.attendanceRateThisYear)}
                </Text>
                {owner &&
                member.role !== ClubMembershipRole.OWNER &&
                member.status === ClubMembershipStatus.ACTIVE ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {member.role === ClubMembershipRole.MEMBER ? (
                      <Button
                        label="운영진 지정"
                        size="sm"
                        variant="secondary"
                        onPress={() =>
                          void api
                            .updateClubMemberRole(clubId!, member.id, ClubMembershipRole.MANAGER)
                            .then(load)
                        }
                      />
                    ) : member.role === ClubMembershipRole.MANAGER ? (
                      <Button
                        label="운영진 해제"
                        size="sm"
                        variant="secondary"
                        onPress={() =>
                          void api
                            .updateClubMemberRole(clubId!, member.id, ClubMembershipRole.MEMBER)
                            .then(load)
                        }
                      />
                    ) : null}
                  </View>
                ) : null}
              </Stack>
            </Card>
          </Pressable>
        ))}
      </Stack>
    </ScrollScreenFrame>
  );
}
