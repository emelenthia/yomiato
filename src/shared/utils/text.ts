import {
  MAX_DISMISSAL_REASON_LENGTH,
  MAX_TITLE_LENGTH,
} from '../constants/limits';
import { ApplicationError } from '../../application/errors/application-error';

export function trimText(value: string): string {
  return value.trim();
}

export function normalizeTitle(title: string, fallback: string): string {
  const normalizedTitle = trimText(title);
  const titleWithFallback = normalizedTitle || trimText(fallback);

  return titleWithFallback.slice(0, MAX_TITLE_LENGTH);
}

export function normalizeDismissalReason(reason: string): string {
  const normalizedReason = trimText(reason);

  if (normalizedReason.length > MAX_DISMISSAL_REASON_LENGTH) {
    throw new ApplicationError('DISMISSAL_REASON_TOO_LONG');
  }

  return normalizedReason;
}
