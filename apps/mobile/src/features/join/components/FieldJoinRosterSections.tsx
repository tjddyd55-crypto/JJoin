import { Button, Section, Text } from '@jjoin/design-system';
import type { JoinDetailDto, JoinParticipantDto } from '@jjoin/types';
import { MemberActionMenu } from '../../member/components/MemberActionMenu';
import { useSession } from '../../../session/SessionContext';
import {
  formatFieldConfirmedMemberSectionTitle,
  listFieldApplicants,
  listFieldConfirmedMembers,
} from '../model/field-join-detail-ops';
import {
  buildFieldJoinMemberCardModel,
  resolveFieldJoinMemberActionInput,
} from '../model/field-join-member-card';
import { FieldJoinMemberProfileCard } from './FieldJoinMemberProfileCard';

type HostApplicantActions = {
  busy: boolean;
  onApprove: (participantId: string) => void;
  onHold: (participantId: string) => void;
  onReject: (participantId: string) => void;
};

type Props = {
  detail: JoinDetailDto;
  isHost: boolean;
  onOpenProfile: (userId: string) => void;
  hostActions?: HostApplicantActions;
};

function ApplicantActions({
  participantId,
  busy,
  onApprove,
  onHold,
  onReject,
}: HostApplicantActions & { participantId: string }) {
  return (
    <>
      <Button
        label="확정"
        loading={busy}
        fullWidth={false}
        onPress={() => onApprove(participantId)}
      />
      <Button
        label="보류"
        variant="secondary"
        loading={busy}
        fullWidth={false}
        onPress={() => onHold(participantId)}
      />
      <Button
        label="미선정"
        variant="secondary"
        loading={busy}
        fullWidth={false}
        onPress={() => onReject(participantId)}
      />
    </>
  );
}

function FieldMemberActions({
  userId,
  nickname,
}: {
  userId: string;
  nickname: string;
}) {
  const { me } = useSession();
  const input = resolveFieldJoinMemberActionInput({
    targetUserId: userId,
    nickname,
    viewerUserId: me?.userId ?? me?.publicProfile?.id,
    coinGiftEnabled: me?.featureFlags?.coinGiftEnabled,
    messagingEnabled: me?.messagePolicy?.enabled,
  });
  if (!input) return null;
  return (
    <MemberActionMenu
      targetUserId={input.targetUserId}
      nickname={input.nickname}
      viewerUserId={input.viewerUserId}
      coinGiftEnabled={input.coinGiftEnabled}
      messagingEnabled={input.messagingEnabled}
    />
  );
}

function ConfirmedMemberCards({
  members,
  onOpenProfile,
}: {
  members: JoinParticipantDto[];
  onOpenProfile: (userId: string) => void;
}) {
  return (
    <>
      {members.map((member) => {
        const model = buildFieldJoinMemberCardModel(member);
        return (
          <FieldJoinMemberProfileCard
            key={member.participantId}
            model={model}
            onOpenProfile={() => onOpenProfile(member.userId)}
            memberActions={
              <FieldMemberActions userId={member.userId} nickname={member.nickname} />
            }
          />
        );
      })}
    </>
  );
}

export function FieldJoinRosterSections({
  detail,
  isHost,
  onOpenProfile,
  hostActions,
}: Props) {
  const confirmed = listFieldConfirmedMembers(detail.participants);
  const applicants = listFieldApplicants(detail.participants);
  const confirmedTitle = formatFieldConfirmedMemberSectionTitle({
    recruitCount: detail.recruitCount,
    plannedPlayerCount: detail.plannedPlayerCount,
    participants: detail.participants,
  });

  return (
    <>
      <Section title={confirmedTitle}>
        {confirmed.length > 0 ? (
          <ConfirmedMemberCards members={confirmed} onOpenProfile={onOpenProfile} />
        ) : (
          <Text variant="caption" tone="secondary">
            아직 확정된 멤버가 없습니다.
          </Text>
        )}
      </Section>

      {isHost ? (
        <Section title={`신청자 ${applicants.length}`}>
          {applicants.length > 0 ? (
            applicants.map((applicant) => (
              <FieldJoinMemberProfileCard
                key={applicant.participantId}
                model={buildFieldJoinMemberCardModel(applicant)}
                onOpenProfile={() => onOpenProfile(applicant.userId)}
                memberActions={
                  <FieldMemberActions
                    userId={applicant.userId}
                    nickname={applicant.nickname}
                  />
                }
                actions={
                  hostActions ? (
                    <ApplicantActions
                      participantId={applicant.participantId}
                      busy={hostActions.busy}
                      onApprove={hostActions.onApprove}
                      onHold={hostActions.onHold}
                      onReject={hostActions.onReject}
                    />
                  ) : null
                }
              />
            ))
          ) : (
            <Text variant="caption" tone="secondary">
              아직 신청자가 없습니다.
            </Text>
          )}
        </Section>
      ) : (
        <Section title={`신청 ${detail.applicationCount ?? applicants.length}`}>
          <Text variant="caption" tone="secondary">
            신청자 상세는 방장만 볼 수 있습니다.
          </Text>
        </Section>
      )}
    </>
  );
}
