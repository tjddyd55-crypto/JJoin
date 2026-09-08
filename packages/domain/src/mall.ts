type MallProductStatusValue = 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'PAUSED' | 'ARCHIVED';

export type MallSortOption = 'recommended' | 'latest' | 'coin_asc';

export const MALL_SORT_OPTIONS: MallSortOption[] = ['recommended', 'latest', 'coin_asc'];

export function buildMallProductCoverObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  productId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const productId = params.productId.trim();
  const fileId = params.fileId.trim();
  if (!productId || !fileId) throw new Error('invalid_mall_product_key');
  return `${params.environmentPrefix}/mall/products/${productId}/cover/${fileId}.${params.extension}`;
}

export function buildMallProductGalleryObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  productId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const productId = params.productId.trim();
  const fileId = params.fileId.trim();
  if (!productId || !fileId) throw new Error('invalid_mall_product_key');
  return `${params.environmentPrefix}/mall/products/${productId}/gallery/${fileId}.${params.extension}`;
}

export function isOwnedMallProductObjectKey(params: {
  objectKey: string;
  environmentPrefix: 'development' | 'production';
  productId: string;
}): boolean {
  const key = params.objectKey.replace(/^\/+/, '');
  const coverPrefix = `${params.environmentPrefix}/mall/products/${params.productId}/cover/`;
  const galleryPrefix = `${params.environmentPrefix}/mall/products/${params.productId}/gallery/`;
  return key.startsWith(coverPrefix) || key.startsWith(galleryPrefix);
}

export function resolveMallPurchaseState(params: {
  productStatus: MallProductStatusValue;
  stock: number;
  coinPrice: string;
  availableCoin: string;
}): 'available' | 'insufficient_coin' | 'sold_out' | 'paused' | 'unavailable' {
  if (params.productStatus === 'SOLD_OUT' || params.stock <= 0) return 'sold_out';
  if (params.productStatus === 'PAUSED' || params.productStatus === 'ARCHIVED' || params.productStatus === 'DRAFT') {
    return params.productStatus === 'PAUSED' ? 'paused' : 'unavailable';
  }
  if (params.productStatus !== 'ACTIVE') return 'unavailable';
  const price = Number(params.coinPrice);
  const balance = Number(params.availableCoin);
  if (!Number.isFinite(price) || !Number.isFinite(balance)) return 'unavailable';
  if (balance < price) return 'insufficient_coin';
  return 'available';
}

export function sortMallProducts<T extends { sortOrder: number; createdAt: string; coinPrice: string }>(
  items: T[],
  sort: MallSortOption,
): T[] {
  const copy = [...items];
  if (sort === 'latest') {
    return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (sort === 'coin_asc') {
    return copy.sort((a, b) => Number(a.coinPrice) - Number(b.coinPrice));
  }
  return copy.sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
}
