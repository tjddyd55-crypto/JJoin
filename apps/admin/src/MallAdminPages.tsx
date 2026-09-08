import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MallProductStatus,
  type AdminMallProductDetailDto,
  type AdminMallProductListItemDto,
  type CreateAdminMallProductRequest,
  type MallCategoryDto,
  type UpdateAdminMallProductRequest,
} from '@jjoin/types';
import { formatNumber } from '@jjoin/domain';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';
const TOKEN_KEY = 'jjoin_admin_token';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${res.status}:${raw.slice(0, 160)}`);
  return JSON.parse(raw) as T;
}

async function uploadFile(path: string, file: File) {
  const token = localStorage.getItem(TOKEN_KEY);
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${res.status}:${raw.slice(0, 160)}`);
  return JSON.parse(raw) as AdminMallProductDetailDto;
}

export function MallAdminListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminMallProductListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<AdminMallProductListItemDto[]>('/admin/mall/products')
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, []);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>쪼인몰 관리</h2>
        <button type="button" onClick={() => navigate('/mall/products/new')}>상품 등록</button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="mall-admin-grid">
        {items.map((item) => (
          <div key={item.id} className="card mall-admin-card">
            {item.coverImageUrl ? (
              <img src={item.coverImageUrl} alt={item.name} className="mall-admin-thumb" />
            ) : (
              <div className="mall-admin-thumb placeholder" />
            )}
            <div className="stack tight">
              <strong>{item.name}</strong>
              <span>{item.categoryName}</span>
              <span>{formatNumber(item.coinPrice)} C · 재고 {item.stock}</span>
              <span className="status-badge">{item.status}</span>
              <Link to={`/mall/products/${item.id}`}>수정</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductForm({
  initial,
  categories,
  onSave,
}: {
  initial?: AdminMallProductDetailDto;
  categories: MallCategoryDto[];
  onSave: (body: CreateAdminMallProductRequest | UpdateAdminMallProductRequest) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [coinPrice, setCoinPrice] = useState(initial?.coinPrice ?? '1000');
  const [stock, setStock] = useState(String(initial?.stock ?? 10));
  const [status, setStatus] = useState<MallProductStatus>(initial?.status ?? MallProductStatus.DRAFT);
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [exchangeGuide, setExchangeGuide] = useState(initial?.exchangeGuide ?? '');
  const [badge, setBadge] = useState(initial?.badge ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({
        name,
        categoryId,
        coinPrice,
        stock: Number(stock),
        status,
        shortDescription,
        description,
        exchangeGuide,
        badge: badge || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save_failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack card">
      <label>상품명<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>
        카테고리
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>판매 코인<input value={coinPrice} onChange={(e) => setCoinPrice(e.target.value)} /></label>
      <label>재고<input value={stock} onChange={(e) => setStock(e.target.value)} /></label>
      <label>
        판매 상태
        <select value={status} onChange={(e) => setStatus(e.target.value as MallProductStatus)}>
          {Object.values(MallProductStatus).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>짧은 설명<textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} /></label>
      <label>상세 설명<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} /></label>
      <label>교환/수령 안내<textarea value={exchangeGuide} onChange={(e) => setExchangeGuide(e.target.value)} rows={4} /></label>
      <label>배지(NEW/인기 등)<input value={badge} onChange={(e) => setBadge(e.target.value)} /></label>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="button" disabled={busy} onClick={() => void submit()}>{busy ? '저장 중…' : '저장'}</button>
    </div>
  );
}

export function MallAdminEditPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isNew = productId === 'new';
  const [categories, setCategories] = useState<MallCategoryDto[]>([]);
  const [product, setProduct] = useState<AdminMallProductDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cats = await api<MallCategoryDto[]>('/admin/mall/categories');
    setCategories(cats);
    if (!isNew && productId) {
      const detail = await api<AdminMallProductDetailDto>(`/admin/mall/products/${productId}`);
      setProduct(detail);
    }
  }, [isNew, productId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, [load]);

  const onSave = async (body: CreateAdminMallProductRequest | UpdateAdminMallProductRequest) => {
    if (isNew) {
      const created = await api<AdminMallProductDetailDto>('/admin/mall/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      navigate(`/mall/products/${created.id}`);
      return;
    }
    if (!productId) return;
    const updated = await api<AdminMallProductDetailDto>(`/admin/mall/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setProduct(updated);
  };

  const onCover = async (file: File) => {
    if (!productId || isNew) return;
    const updated = await uploadFile(`/admin/mall/products/${productId}/cover`, file);
    setProduct(updated);
  };

  const onGallery = async (file: File) => {
    if (!productId || isNew) return;
    const updated = await uploadFile(`/admin/mall/products/${productId}/images`, file);
    setProduct(updated);
  };

  return (
    <div className="stack">
      <button type="button" onClick={() => navigate('/mall/products')}>← 상품 목록</button>
      <h2>{isNew ? '상품 등록' : '상품 수정'}</h2>
      {error ? <p className="error-text">{error}</p> : null}
      <ProductForm initial={product ?? undefined} categories={categories} onSave={onSave} />
      {!isNew && product ? (
        <div className="stack card">
          <h3>이미지</h3>
          {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" className="mall-admin-preview" /> : null}
          <label>
            대표 이미지
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onCover(file);
            }} />
          </label>
          <label>
            추가 이미지
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onGallery(file);
            }} />
          </label>
          <div className="row">
            {product.images.map((image) => (
              <img key={image.id} src={image.imageUrl} alt="" className="mall-admin-thumb" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
