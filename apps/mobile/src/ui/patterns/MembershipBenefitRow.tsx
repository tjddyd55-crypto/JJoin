import { Row, Text } from '@jjoin/design-system';

type MembershipBenefitRowProps = {
  label: string;
  description?: string;
};

export function MembershipBenefitRow({ label, description }: MembershipBenefitRowProps) {
  return (
    <Row justify="space-between" align="flex-start" gap="md">
      <Text variant="body" tone="primary">
        {label}
      </Text>
      {description ? (
        <Text variant="meta" tone="secondary">
          {description}
        </Text>
      ) : null}
    </Row>
  );
}
