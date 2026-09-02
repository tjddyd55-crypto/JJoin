import { useMemo, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Row, Text, spacing, useTheme } from '@jjoin/design-system';
import { localDayKey } from '@jjoin/domain';
import { formatKstDatePickerLabel } from './kst-date-format';

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'] as const;

type Props = {
  label?: string;
  dateYmd: string;
  onChange: (dateYmd: string) => void;
  /** When true, dates before today (KST) are disabled. */
  disallowPast?: boolean;
};

function parseYmd(dateYmd: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function ymdFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function KstDatePickerField({ label, dateYmd, onChange, disallowPast = true }: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;
  const todayYmd = localDayKey(new Date(), 'Asia/Seoul');
  const initial = parseYmd(dateYmd);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
    const startWeekday = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    const grid: Array<{ day: number | null; ymd: string | null }> = [];
    for (let i = 0; i < startWeekday; i += 1) grid.push({ day: null, ymd: null });
    for (let day = 1; day <= daysInMonth; day += 1) {
      grid.push({ day, ymd: ymdFromParts(viewYear, viewMonth, day) });
    }
    return grid;
  }, [viewMonth, viewYear]);

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <View style={styles.block}>
      {label ? (
        <Text variant="bodyStrong">{label}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${formatKstDatePickerLabel(dateYmd)}` : formatKstDatePickerLabel(dateYmd)}
        onPress={() => {
          Keyboard.dismiss();
          const p = parseYmd(dateYmd);
          setViewYear(p.year);
          setViewMonth(p.month);
          setOpen(true);
        }}
        style={[
          styles.field,
          {
            borderColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.surface.card,
            minHeight: theme.sizes.input.md,
          },
        ]}
      >
        <Row align="center" gap="sm">
          <Icon name="calendar" size="md" tone="tertiary" />
          <Text variant="body" style={styles.fieldText}>
            {formatKstDatePickerLabel(dateYmd)}
          </Text>
          <Icon name="chevronDown" size="sm" tone="tertiary" />
        </Row>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface.elevated }]}>
            <View style={styles.monthRow}>
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
                <Text variant="bodyStrong">{'\u2039'}</Text>
              </Pressable>
              <Text variant="sectionTitle">
                {viewYear}. {String(viewMonth).padStart(2, '0')}
              </Text>
              <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
                <Text variant="bodyStrong">{'\u203a'}</Text>
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAY_HEADERS.map((w) => (
                <Text key={w} variant="caption" tone="tertiary" style={styles.weekCell}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                if (!cell.day || !cell.ymd) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }
                const isToday = cell.ymd === todayYmd;
                const isSelected = cell.ymd === dateYmd;
                const isPast = disallowPast && cell.ymd < todayYmd;
                return (
                  <Pressable
                    key={cell.ymd}
                    disabled={isPast}
                    onPress={() => {
                      onChange(cell.ymd!);
                      setOpen(false);
                    }}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: gold },
                      isToday && !isSelected && styles.todayRing,
                    ]}
                  >
                    <Text
                      variant="body"
                      style={{
                        color: isSelected
                          ? '#1A1A1A'
                          : isPast
                            ? theme.colors.text.tertiary
                            : theme.colors.text.primary,
                      }}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label="닫기" variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  fieldText: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  todayRing: {
    borderWidth: 1,
    borderColor: '#C9A227',
  },
});
