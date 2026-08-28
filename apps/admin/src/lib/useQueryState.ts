import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type QueryPatch = Record<string, string | number | null | undefined>;

function applyPatch(params: URLSearchParams, patch: QueryPatch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '') next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}

/**
 * URL search-params sync. `q` is mirrored with a debounced local draft for typing.
 */
export function useQueryState(options?: { debounceMs?: number }) {
  const debounceMs = options?.debounceMs ?? 300;
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const status = searchParams.get('status') ?? '';

  const [qDraft, setQDraft] = useState(q);

  useEffect(() => {
    setQDraft(q);
  }, [q]);

  useEffect(() => {
    if (qDraft === q) return;
    const timer = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = applyPatch(prev, { q: qDraft || null, page: 1 });
          return next;
        },
        { replace: true },
      );
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [qDraft, q, debounceMs, setSearchParams]);

  const setParams = useCallback(
    (patch: QueryPatch, replace = true) => {
      setSearchParams((prev) => applyPatch(prev, patch), { replace });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setParams({ page: nextPage > 1 ? nextPage : null });
    },
    [setParams],
  );

  const setStatus = useCallback(
    (next: string) => {
      setParams({ status: next || null, page: 1 });
    },
    [setParams],
  );

  return useMemo(
    () => ({
      searchParams,
      q,
      qDraft,
      setQDraft,
      page,
      status,
      setPage,
      setStatus,
      setParams,
    }),
    [searchParams, q, qDraft, page, status, setPage, setStatus, setParams],
  );
}
