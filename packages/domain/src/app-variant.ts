export type AppVariantName = 'development' | 'production';

export function normalizeAppVariant(raw: string | undefined | null): AppVariantName {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'development' || v === 'dev') return 'development';
  return 'production';
}

export function appVariantToDb(variant: AppVariantName): 'DEVELOPMENT' | 'PRODUCTION' {
  return variant === 'development' ? 'DEVELOPMENT' : 'PRODUCTION';
}

export function appVariantFromDb(raw: string): AppVariantName {
  return raw === 'DEVELOPMENT' ? 'development' : 'production';
}
