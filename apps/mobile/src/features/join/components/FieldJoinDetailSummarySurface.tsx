import { StyleSheet, View } from 'react-native';
import { Badge, Text, useTheme } from '@jjoin/design-system';
import {
  FIELD_DETAIL_SECTION_TITLES,
  type FieldJoinDetailSummary,
} from '../model/field-join-detail-summary';

type Props = {
  summary: FieldJoinDetailSummary;
};

type KvCell = { label: string; value: string };

function SurfaceDivider() {
  const theme = useTheme();
  return (
    <View
      style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]}
    />
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <Text variant="caption" tone="secondary" style={styles.sectionTitle}>
      {title}
    </Text>
  );
}

function TwoColGrid({ cells }: { cells: KvCell[] }) {
  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View key={cell.label} style={styles.gridCell}>
          <Text variant="caption" tone="secondary" style={styles.cellLabel}>
            {cell.label}
          </Text>
          <Text variant="bodyStrong" tone="primary" style={styles.cellValue}>
            {cell.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InlineKvRow({ label, value }: KvCell) {
  return (
    <View style={styles.kvRow}>
      <Text variant="caption" tone="secondary" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="bodyStrong" tone="primary" style={styles.kvValue}>
        {value}
      </Text>
    </View>
  );
}

function RoundingSection({ summary }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeading title={FIELD_DETAIL_SECTION_TITLES[0]} />
      <TwoColGrid
        cells={[
          { label: '날짜', value: summary.rounding.date },
          { label: '티타임', value: summary.rounding.teeTime },
          { label: '지역', value: summary.rounding.location },
          { label: '그린피', value: summary.rounding.greenFee },
        ]}
      />
    </View>
  );
}

function RecruitSection({ summary }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeading title={FIELD_DETAIL_SECTION_TITLES[1]} />
      <View style={styles.kvList}>
        <InlineKvRow label="모집" value={summary.recruit.count} />
        <InlineKvRow label="성별" value={summary.recruit.gender} />
        <InlineKvRow label="나이" value={summary.recruit.age} />
      </View>
    </View>
  );
}

function BenefitsSection({ summary }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeading title={FIELD_DETAIL_SECTION_TITLES[2]} />
      {summary.benefits.selected.length > 0 ? (
        <View style={styles.badgeRow}>
          {summary.benefits.selected.map((label) => (
            <Badge key={label} label={label} variant="neutral" />
          ))}
        </View>
      ) : (
        <Text variant="caption" tone="tertiary" style={styles.emptyLine}>
          {summary.benefits.emptyMessage}
        </Text>
      )}
      {summary.benefits.coinBadge ? (
        <View style={styles.coinRow}>
          <Badge label={summary.benefits.coinBadge} variant="accent" />
        </View>
      ) : null}
    </View>
  );
}

function MemoSection({ summary }: Props) {
  if (!summary.memo.body) return null;
  return (
    <View style={styles.section}>
      <SectionHeading title={FIELD_DETAIL_SECTION_TITLES[3]} />
      <Text variant="body" tone="primary" style={styles.memoBody}>
        {summary.memo.body}
      </Text>
    </View>
  );
}

/**
 * Single-surface FIELD core info. Parent supplies the white card;
 * this file never paints a nested panel background.
 */
export function FieldJoinDetailSummarySurface({ summary }: Props) {
  return (
    <View style={styles.root}>
      <RoundingSection summary={summary} />
      <SurfaceDivider />
      <RecruitSection summary={summary} />
      <SurfaceDivider />
      <BenefitsSection summary={summary} />
      {summary.memo.body ? (
        <>
          <SurfaceDivider />
          <MemoSection summary={summary} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 10,
  },
  gridCell: {
    width: '47%',
    flexGrow: 1,
    minWidth: 0,
    gap: 2,
  },
  cellLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  cellValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  kvList: {
    gap: 6,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    minWidth: 0,
  },
  kvLabel: {
    width: 36,
    fontSize: 12,
    lineHeight: 16,
  },
  kvValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  coinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emptyLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  memoBody: {
    fontSize: 15,
    lineHeight: 22,
  },
});
