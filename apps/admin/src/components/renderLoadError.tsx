import type { ReactElement } from 'react';
import { ApiError } from '../lib/api';
import { ForbiddenState } from './ForbiddenState';
import { ErrorState } from './ErrorState';

export function renderLoadError(
  err: unknown,
  onRetry?: () => void,
): ReactElement {
  if (err instanceof ApiError && err.status === 403) {
    return <ForbiddenState />;
  }
  const message = err instanceof Error ? err.message : '알 수 없는 오류';
  return <ErrorState message={message} onRetry={onRetry} />;
}
