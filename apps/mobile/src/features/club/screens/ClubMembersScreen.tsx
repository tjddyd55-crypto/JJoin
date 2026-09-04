import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  Chip,
  ClubEmptyState,
  ClubSection,
  Input,
  ScrollScreenFrame,
  Stack,
} from '@jjoin/design-system';
import { formatAttendanceRateDisplay, isClubStaff } from '@jjoin/domain';
import {
  ClubMembershipRole,
  ClubMembershipStatus,
  type ClubMembershipDto,
} from '@jjoin/types';
import { ClubMemberRow } from '../components/ClubMemberRow';
import { CLUB_SECTION_GAP } from '../components/ClubFormSection';
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
  const activeMembers = items.filter((m) => m.status !== ClubMembershipStatus.PENDING);
  const staffMembers = activeMembers.filter(
    (m) => m.role === ClubMembershipRole.OWNER || m.role === ClubMembershipRole.MANAGER,
  );
  const regularMembers = activeMembers.filter((m) => m.role === ClubMembershipRole.MEMBER);

  const filterMembers = (list: ClubMembershipDto[]) =>
    list
      .filter((m) => {
        if (filter === 'STAFF') return m.role === ClubMembershipRole.OWNER || m.role === ClubMembershipRole.MANAGER;
        if (filter === 'MEMBER') return m.role === ClubMembershipRole.MEMBER;
        return true;
      })
      .filter((m) => !query.trim() || m.nickname.includes(query.trim()));

  const filteredStaff = filterMembers(staffMembers);
  const filteredMembers = filterMembers(regularMembers);

  const memberMeta = (member: ClubMembershipDto) =>
    `가입일 ${member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ko-KR') : '-'} · 올해 참석률 ${formatAttendanceRateDisplay(member.attendanceRateThisYear)}`;

  const renderMemberActions = (member: ClubMembershipDto) => {
    if (!owner || member.role === ClubMembershipRole.OWNER || member.status !== ClubMembershipStatus.ACTIVE) {
      return null;
    }
    if (member.role === ClubMembershipRole.MEMBER) {
      return (
        <Button
          label="운영진 지정"
          size="sm"
          variant="secondary"
          onPress={() =>
            void api.updateClubMemberRole(clubId!, member.id, ClubMembershipRole.MANAGER).then(load)
          }
        />
      );
    }
    if (member.role === ClubMembershipRole.MANAGER) {
      return (
        <Button
          label="운영진 해제"
          size="sm"
          variant="secondary"
          onPress={() =>
            void api.updateClubMemberRole(clubId!, member.id, ClubMembershipRole.MEMBER).then(load)
          }
        />
      );
    }
    return null;
  };

  const empty = activeMembers.length === 0 && pending.length === 0;

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md" style={{ gap: CLUB_SECTION_GAP }}>
        <Input value={query} onChangeText={setQuery} placeholder="닉네임 검색" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['ALL', 'STAFF', 'MEMBER'] as const).map((value) => (
            <Chip
              key={value}
              label={value === 'ALL' ? '전체' : value === 'STAFF' ? '운영진' : '회원'}
              selected={filter === value}
              onPress={() => setFilter(value)}
            />
          ))}
        </View>

        {staff && pending.length > 0 ? (
          <ClubSection title={`승인 대기 ${pending.length}명`}>
            {pending.map((member) => (
              <ClubMemberRow
                key={member.id}
                nickname={member.nickname}
                role={member.role}
                meta={`신청일 ${new Date(member.requestedAt).toLocaleDateString('ko-KR')}${member.ageGroupLabel ? ` · ${member.ageGroupLabel}` : ''}`}
                actions={
                  <>
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
                  </>
                }
              />
            ))}
          </ClubSection>
        ) : null}

        {filter !== 'MEMBER' && filteredStaff.length > 0 ? (
          <ClubSection title="운영진">
            {filteredStaff.map((member) => (
              <ClubMemberRow
                key={member.id}
                nickname={member.nickname}
                role={member.role}
                meta={memberMeta(member)}
                onPress={() => router.push(`/my/clubs/${clubId}/members/${member.userId}` as Href)}
                actions={renderMemberActions(member)}
              />
            ))}
          </ClubSection>
        ) : null}

        {filter !== 'STAFF' && filteredMembers.length > 0 ? (
          <ClubSection title="가입 회원">
            {filteredMembers.map((member) => (
              <ClubMemberRow
                key={member.id}
                nickname={member.nickname}
                role={member.role}
                meta={memberMeta(member)}
                onPress={() => router.push(`/my/clubs/${clubId}/members/${member.userId}` as Href)}
                actions={renderMemberActions(member)}
              />
            ))}
          </ClubSection>
        ) : null}

        {empty ? (
          <ClubEmptyState title="아직 회원이 없습니다" description="가입 승인 후 회원 목록이 표시됩니다." />
        ) : null}

        {!empty && filteredStaff.length === 0 && filteredMembers.length === 0 ? (
          <ClubEmptyState title="검색 결과가 없습니다" description="다른 검색어를 입력해 보세요." />
        ) : null}
      </Stack>
    </ScrollScreenFrame>
  );
}
