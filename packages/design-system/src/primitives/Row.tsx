import { Stack } from './Stack';
import type { ComponentProps } from 'react';

export type RowProps = Omit<ComponentProps<typeof Stack>, 'direction'>;

export function Row(props: RowProps) {
  return <Stack {...props} direction="row" />;
}
