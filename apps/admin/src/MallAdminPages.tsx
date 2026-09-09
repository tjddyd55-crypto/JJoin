import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MallContentBlockType,
  MallProductStatus,
  type AdminMallContentBlockInput,
  type AdminMallProductDetailDto,
  type AdminMallProductListItemDto,
  type CreateAdminMallProductRequest,
  type MallCategoryDto,
  type MallProductContentBlockDto,
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

async function uploadFile(path: string, file: File, extra?: Record<string, string>) {
  const token = localStorage.getItem(TOKEN_KEY);
  const form = new FormData();
  form.append('file', file);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      form.append(key, value);
    }
  }
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

type EditableBlock = AdminMallContentBlockInput & {
  id: string;
  imageUrl?: string | null;
};

function toEditableBlocks(blocks: MallProductContentBlockDto[]): EditableBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    type: block.type,
    sortOrder: block.sortOrder,
    text: block.text,
    imageObjectKey: block.imageObjectKey ?? null,
    imageUrl: block.imageUrl,
  }));
}

function toSavePayload(blocks: EditableBlock[]): AdminMallContentBlockInput[] {
  return blocks.map((block, index) => ({
    ...(block.id.startsWith('draft-') ? {} : { id: block.id }),
    type: block.type,
    sortOrder: index,
    text: block.text ?? null,
    imageObjectKey: block.imageObjectKey ?? null,
  }));
}

function ContentBlockEditor({
  productId,
  blocks,
  onChange,
}: {
  productId: string;
  blocks: EditableBlock[];
  onChange: (next: EditableBlock[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = (index: number, delta: number) => {
    const next = [...blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next.map((block, sortOrder) => ({ ...block, sortOrder })));
  };

  const remove = async (index: number) => {
    const block = blocks[index];
    if (!block) return;
    setBusy(true);
    setError(null);
    try {
      if (!block.id.startsWith('draft-')) {
        await api(`/admin/mall/products/${productId}/content-blocks/${block.id}`, {
          method: 'DELETE',
        });
      }
      onChange(blocks.filter((_, i) => i !== index).map((row, sortOrder) => ({ ...row, sortOrder })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete_failed');
    } finally {
      setBusy(false);
    }
  };

  const addTextBlock = (type: MallContentBlockType) => {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onChange([
      ...blocks,
      {
        id,
        type,
        sortOrder: blocks.length,
        text: '',
        imageObjectKey: null,
      },
    ]);
  };

  const saveBlocks = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api<AdminMallProductDetailDto>(
        `/admin/mall/products/${productId}/content-blocks`,
        {
          method: 'PUT',
          body: JSON.stringify({ blocks: toSavePayload(blocks) }),
        },
      );
      onChange(toEditableBlocks(updated.contentBlocks));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save_failed');
    } finally {
      setBusy(false);
    }
  };

  const onImageUpload = async (file: File, blockId?: string, sortOrder?: number) => {
    setBusy(true);
    setError(null);
    try {
      const path = blockId
        ? `/admin/mall/products/${productId}/content-blocks/${blockId}/image`
        : `/admin/mall/products/${productId}/content-blocks/image`;
      const updated = await uploadFile(
        path,
        file,
        sortOrder != null ? { sortOrder: String(sortOrder) } : undefined,
      );
      onChange(toEditableBlocks(updated.contentBlocks));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload_failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mall-admin-form-card" style={{ marginTop: 20 }}>
      <h3>?? ??? ??</h3>
      <p style={{ color: '#7d8780', fontSize: 13 }}>
        ?? ? ??? ? ??? ? ?? ??? ???? ?????.
      </p>
      <div className="mall-admin-blocks">
        {blocks.map((block, index) => (
          <div key={block.id} className="mall-admin-block-row">
            <div className="mall-admin-block-toolbar">
              <span className="mall-admin-block-type">{block.type}</span>
              <div className="mall-admin-block-actions">
                <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                  ??
                </button>
                <button
                  type="button"
                  disabled={busy || index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ???
                </button>
                <button type="button" disabled={busy} onClick={() => void remove(index)}>
                  ??
                </button>
              </div>
            </div>
            {block.type === MallContentBlockType.IMAGE ? (
              <>
                {block.imageUrl ? (
                  <img src={block.imageUrl} alt="" className="mall-admin-block-image" />
                ) : (
                  <div className="mall-admin-block-image" />
                )}
                <label className="mall-admin-upload">
                  ??? ??
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onImageUpload(file, block.id);
                    }}
                  />
                </label>
              </>
            ) : (
              <textarea
                value={block.text ?? ''}
                onChange={(e) => {
                  const next = [...blocks];
                  next[index] = { ...block, text: e.target.value };
                  onChange(next);
                }}
                placeholder={
                  block.type === MallContentBlockType.HEADING
                    ? '?? ??'
                    : block.type === MallContentBlockType.NOTICE
                      ? '?? ??'
                      : '?? ???'
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className="mall-admin-block-add-row" style={{ marginTop: 12 }}>
        <button type="button" disabled={busy} onClick={() => addTextBlock(MallContentBlockType.HEADING)}>
          + ??
        </button>
        <button type="button" disabled={busy} onClick={() => addTextBlock(MallContentBlockType.TEXT)}>
          + ???
        </button>
        <button type="button" disabled={busy} onClick={() => addTextBlock(MallContentBlockType.NOTICE)}>
          + ??
        </button>
        <label className="mall-admin-chip" style={{ cursor: 'pointer' }}>
          + ???
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImageUpload(file, undefined, blocks.length);
            }}
          />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button
        type="button"
        className="mall-admin-btn-primary"
        style={{ marginTop: 12 }}
        disabled={busy}
        onClick={() => void saveBlocks()}
      >
        {busy ? '?? ??' : '?? ??'}
      </button>
    </div>
  );
}

function statusLabel(status: MallProductStatus): string {
  if (status === MallProductStatus.ACTIVE) return '???';
  if (status === MallProductStatus.SOLD_OUT) return '??';
  if (status === MallProductStatus.PAUSED || status === MallProductStatus.ARCHIVED) return '??';
  return '???';
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
        <h2>??? ??</h2>
        <button type="button" className="mall-admin-btn-primary" onClick={() => navigate('/mall/products/new')}>
          ?? ??
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="mall-admin-stats">
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">??? ??</div>
          <div className="mall-admin-stat-value">{stats.active}</div>
        </div>
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">?? ??</div>
          <div className="mall-admin-stat-value">?</div>
        </div>
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">?? ?? ??</div>
          <div className="mall-admin-stat-value">?</div>
        </div>
        <div className="mall-admin-stat">
          <div className="mall-admin-stat-label">?? ??</div>
          <div className="mall-admin-stat-value">{stats.soldOut}</div>
        </div>
      </div>

      <div className="mall-admin-tabs">
        <span className="mall-admin-chip active">?? ??</span>
        <span className="mall-admin-chip">?? ??</span>
        <span className="mall-admin-chip">????</span>
        <span className="mall-admin-chip">??</span>
      </div>

      <div className="mall-admin-toolbar">
        <input
          className="mall-admin-search"
          placeholder="??? / ???? ??"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mall-admin-toolbar-chips">
          <button
            type="button"
            className={`mall-admin-chip ${statusFilter === MallProductStatus.ACTIVE ? 'active' : ''}`}
            onClick={() => setStatusFilter(MallProductStatus.ACTIVE)}
          >
            ???
          </button>
          <button
            type="button"
            className={`mall-admin-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            ?? ????
          </button>
        </div>
      </div>

      <div className="mall-admin-table">
        <div className="mall-admin-table-head">
          <span>??</span>
          <span>????</span>
          <span>???(??)</span>
          <span>??</span>
          <span>??</span>
          <span>??</span>
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
              <Link to={`/mall/products/${item.id}`}>??</Link>
              {' ? '}
              <span>???</span>
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
        <label>???</label>
        <input value={name} placeholder="???? ?????" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>????</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="mall-admin-field">
        <label>??? (??)</label>
        <input value={coinPrice} onChange={(e) => setCoinPrice(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>?? ??</label>
        <input value={stock} placeholder="??? / ?? ??" onChange={(e) => setStock(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>?? ??</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as MallProductStatus)}>
          {Object.values(MallProductStatus).map((value) => (
            <option key={value} value={value}>{statusLabel(value)}</option>
          ))}
        </select>
      </div>
      <div className="mall-admin-field">
        <label>?? ??</label>
        <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>?? ???/??</label>
        <textarea value={description} placeholder="?? ?? ?? ?? ???? ?????." onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>??/?? ??</label>
        <textarea value={exchangeGuide} onChange={(e) => setExchangeGuide(e.target.value)} />
      </div>
      <div className="mall-admin-field">
        <label>??(NEW/?? ?)</label>
        <input value={badge} onChange={(e) => setBadge(e.target.value)} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button type="button" className="mall-admin-btn-primary" disabled={busy} onClick={() => void submit()}>
        {busy ? '?? ??' : '??'}
      </button>
    </div>
  );
}

function MobilePreview({ product }: { product?: AdminMallProductDetailDto | null }) {
  const previewName = product?.name || '???';
  const previewPrice = product ? `${formatMallCoinAdmin(product.coinPrice)} ??` : '0 ??';

  return (
    <div className="mall-admin-preview-card">
      <div className="mall-admin-preview-title">????</div>
      {product?.coverImageUrl ? (
        <img src={product.coverImageUrl} alt="" className="mall-admin-preview-image" />
      ) : (
        <div className="mall-admin-preview-image" />
      )}
      <div className="mall-admin-preview-name">{previewName}</div>
      <div className="mall-admin-preview-price">{previewPrice}</div>
      <div className="mall-admin-preview-cta">???? ??</div>
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
  const [contentBlocks, setContentBlocks] = useState<EditableBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cats = await api<MallCategoryDto[]>('/admin/mall/categories');
    setCategories(cats);
    if (!isNew && productId) {
      const detail = await api<AdminMallProductDetailDto>(`/admin/mall/products/${productId}`);
      setProduct(detail);
      setDraft(detail);
      setContentBlocks(toEditableBlocks(detail.contentBlocks ?? []));
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
    setDraft(updated);
    setContentBlocks(toEditableBlocks(updated.contentBlocks ?? []));
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
        <h2>{isNew ? '?? ??' : '?? ??'}</h2>
        <button type="button" className="mall-admin-btn-primary" onClick={() => navigate('/mall/products')}>
          ??
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
                <label>?? ???</label>
                <label className="mall-admin-upload">
                  ? ?? ??? ???
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
          {!isNew && productId ? (
            <ContentBlockEditor
              productId={productId}
              blocks={contentBlocks}
              onChange={setContentBlocks}
            />
          ) : null}
        </div>
        <MobilePreview product={previewProduct} />
      </div>
    </div>
  );
}
