export const colors = {
  primary: '#0A6B56',
  primarySoft: '#E0F2ED',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  textPrimary: '#1C2128',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  danger: '#C0392B',
  dangerSoft: '#FDECEC',
  warning: '#B86B14',
  warningSoft: '#FFF4E5',
  coin: '#26748C',
  coinSoft: '#E8F4F7',
  overlay: 'rgba(20, 22, 26, 0.55)',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
