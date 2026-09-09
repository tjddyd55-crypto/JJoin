import { useCallback, useEffect, useMemo, useState } from 'react';
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

function statusLabel(status: MallProductStatus): string {
  if (status === MallProductStatus.ACTIVE) return '판매중';
  if (status === MallProductStatus.SOLD_OUT) return '품절';
  if (status === MallProductStatus.PAUSED || status === MallProductStatus.ARCHIVED) return '숨김';
  return '작성중';
}

function statusClass(status: MallProductStatus): string {
  if (status === MallProductStatus.ACTIVE) return 'mall-admin-status-active';
  if (status === MallProductStatus.SOLD_OUT) return 'mall-admin-status-soldout';
  return 'mall-admin-status-hidden';
}

function formatMallCoinAdmin(value: string): string {
  return formatNumber(value);
}

export function MallAdminListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminMallProductListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MallProductStatus>('all');

  useEffect(() => {
    void api<AdminMallProductListItemDto[]>('/admin/mall/products')
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(() => ({
    active: items.filter((item) => item.status === MallProductStatus.ACTIVE).length,
    soldOut: items.filter((item) => item.status === MallProductStatus.SOLD_OUT).length,
  }), [items]);

  return (
    <div className="mall-admin-page">
      <div className="mall-admin-topbar">
        <h2>쪼인몰 관리</h2>
        <button type="button" className="mall-admin-btn-primary" onClick={() => navigate('/admin/mall/products/new')}>
          상품 등록
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="mall-admin-stats">
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">판매중 상품</div>
          <div className="mall-admin-stat-value">{stats.active}</div>
        </div>
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">오늘 주문</div>
          <div className="mall-admin-stat-value">—</div>
        </div>
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">오늘 사용 코인</div>
          <div className="mall-admin-stat-value">—</div>
        </div>
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">품절 상품</div>
          <div className="mall-admin-stat-value">{stats.soldOut}</div>
        </div>
      </div>

      <div className="mall-admin-tabs">
        <span className="mall-admin-chip active">상품 관리</span>
        <span className="mall-admin-chip">주문 관리</span>
        <span className="mall-admin-chip">카테고리</span>
        <span className="mall-admin-chip">배너</span>
      </div>

      <div className="mall-admin-toolbar">
        <input
          className="mall-admin-search"
          placeholder="상품명 / 상품코드 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mall-admin-toolbar-chips">
          <button
            type="button"
            className={`mall-admin-chip ${statusFilter === MallProductStatus.ACTIVE ? 'active' : ''}`}
            onClick={() => setStatusFilter(MallProductStatus.ACTIVE)}
          >
            판매중
          </button>
          <button
            type="button"
            className={`mall-admin-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            전체 카테고리
          </button>
        </div>
      </div>

      <div className="mall-admin-table">
        <div className="mall-admin-table-head">
          <span>상품</span>
          <span>카테고리</span>
          <span>판매가(코인)</span>
          <span>재고</span>
          <span>상태</span>
          <span>관리</span>
        </div>
        {filtered.map((item) => (
          <div key={item.id} className="mall-admin-table-row">
            <div className="mall-admin-product-cell">
              {item.coverImageUrl ? (
                <img src={item.coverImageUrl} alt={item.name} className="mall-admin-thumb" />
              ) : (
                <div className="mall-admin-thumb placeholder" />
              )}
              <div>
                <div className="mall-admin-product-name">{item.name}</div>
                <div className="mall-admin-product-code">{item.slug}</div>
              </div>
            </div>
            <span>{item.categoryName}</span>
            <span className="mall-admin-price">{formatMallCoinAdmin(item.coinPrice)}</span>
            <span>{item.stock}</span>
            <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
            <span>
              <Link to={`/admin/mall/products/${item.id}`}>수정</Link>
              {' · '}
              <span>더보기</span>
            </span>
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
    <div className="mall-admin-form-card">
      <div className="mall-admin-field">
        <label>상품명</label>
        <input value={name} placeholder="상품명을 입력하세요" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>카테고리</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="mall-admin-field">
        <label>판매가 (코인)</label>
        <input value={coinPrice} onChange={(e) => setCoinPrice(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>재고 관리</label>
        <input value={stock} placeholder="무제한 / 수량 지정" onChange={(e) => setStock(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>상품 상태</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as MallProductStatus)}>
          {Object.values(MallProductStatus).map((value) => (
            <option key={value} value={value}>{statusLabel(value)}</option>
          ))}
        </select>
      </div>
      <div className="mall-admin-field">
        <label>짧은 설명</label>
        <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>상세 이미지/설명</label>
        <textarea value={description} placeholder="상품 설명 또는 상세 이미지를 등록하세요." onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>교환/수령 안내</label>
        <textarea value={exchangeGuide} onChange={(e) => setExchangeGuide(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>배지(NEW/인기 등)</label>
        <input value={badge} onChange={(e) => setBadge(e.target.value)} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button type="button" className="mall-admin-btn-primary" disabled={busy} onClick={() => void submit()}>
        {busy ? '저장 중…' : '저장'}
      </button>
    </div>
  );
}

function MobilePreview({ product }: { product?: AdminMallProductDetailDto | null }) {
  const previewName = product?.name || '상품명';
  const previewPrice = product ? `${formatMallCoinAdmin(product.coinPrice)} 코인` : '0 코인';

  return (
    <div className="mall-admin-preview-card">
      <div className="mall-admin-preview-title">미리보기</div>
      {product?.coverImageUrl ? (
        <img src={product.coverImageUrl} alt="" className="mall-admin-preview-image" />
      ) : (
        <div className="mall-admin-preview-image" />
      )}
      <div className="mall-admin-preview-name">{previewName}</div>
      <div className="mall-admin-preview-price">{previewPrice}</div>
      <div className="mall-admin-preview-cta">코인으로 구매</div>
    </div>
  );
}

export function MallAdminEditPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isNew = productId === 'new';
  const [categories, setCategories] = useState<MallCategoryDto[]>([]);
  const [product, setProduct] = useState<AdminMallProductDetailDto | null>(null);
  const [draft, setDraft] = useState<Partial<AdminMallProductDetailDto>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cats = await api<MallCategoryDto[]>('/admin/mall/categories');
    setCategories(cats);
    if (!isNew && productId) {
      const detail = await api<AdminMallProductDetailDto>(`/admin/mall/products/${productId}`);
      setProduct(detail);
      setDraft(detail);
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
      navigate(`/admin/mall/products/${created.id}`);
      return;
    }
    if (!productId) return;
    const updated = await api<AdminMallProductDetailDto>(`/admin/mall/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setProduct(updated);
    setDraft(updated);
  };

  const onCover = async (file: File) => {
    if (!productId || isNew) return;
    const updated = await uploadFile(`/admin/mall/products/${productId}/cover`, file);
    setProduct(updated);
    setDraft(updated);
  };

  const previewProduct = useMemo(() => ({
    ...(product ?? {}),
    ...draft,
    name: draft.name ?? product?.name,
    coinPrice: draft.coinPrice ?? product?.coinPrice,
    coverImageUrl: product?.coverImageUrl ?? null,
  }), [draft, product]) as AdminMallProductDetailDto | null;

  return (
    <div className="mall-admin-page">
      <div className="mall-admin-topbar">
        <h2>{isNew ? '상품 등록' : '상품 수정'}</h2>
        <button type="button" className="mall-admin-btn-primary" onClick={() => navigate('/admin/mall/products')}>
          목록
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="mall-admin-edit-layout">
        <div>
          <ProductForm
            initial={product ?? undefined}
            categories={categories}
            onSave={onSave}
          />
          {!isNew && product ? (
            <div className="mall-admin-form-card" style={{ marginTop: 20 }}>
              <div className="mall-admin-field">
                <label>대표 이미지</label>
                <label className="mall-admin-upload">
                  ＋ 대표 이미지 업로드
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onCover(file);
                    }}
                  />
                </label>
              </div>
              {product.coverImageUrl ? (
                <img src={product.coverImageUrl} alt="" className="mall-admin-preview-image" />
              ) : null}
            </div>
          ) : null}
        </div>
        <MobilePreview product={previewProduct} />
      </div>
    </div>
  );
}
