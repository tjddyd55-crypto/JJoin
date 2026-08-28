import { formatDateTime } from '../../lib/format';

type DateTimeCellProps = {
  value: string | null | undefined;
};

export function DateTimeCell({ value }: DateTimeCellProps) {
  return <span>{formatDateTime(value)}</span>;
}
