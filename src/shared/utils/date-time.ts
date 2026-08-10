import { ApplicationError } from '../../application/errors/application-error';

export function toUtcIsoString(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new ApplicationError('INVALID_INPUT', 'Invalid date');
  }

  return value.toISOString();
}

export function formatDisplayDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new ApplicationError('INVALID_INPUT', 'Invalid date');
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
