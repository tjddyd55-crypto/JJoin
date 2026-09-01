import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, ScrollScreenFrame, Stack, Text, spacing } from '@jjoin/design-system';
import { formatAttendanceRateDisplay, isClubStaff } from '@jjoin/domain';
import {
  ClubMembershipStatus,
  type ClubMembershipDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubMembersScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubMembershipDto[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

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

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">회원</Text>
        {items.map((member) => (
          <Card key={member.id} padding="md">
            <Stack gap="xs">
              <Text variant="bodyStrong">
                {member.nickname} · {member.role}
              </Text>
              <Text variant="caption" tone="secondary">
                올해 참석률 {formatAttendanceRateDisplay(member.attendanceRateThisYear)}
              </Text>
              {staff && member.status === ClubMembershipStatus.PENDING ? (
                <Button
                  label="승인"
                  size="sm"
                  onPress={() => void api.approveClubMember(clubId!, member.id).then(load)}
                />
              ) : null}
            </Stack>
          </Card>
        ))}
      </Stack>
    </ScrollScreenFrame>
  );
}
