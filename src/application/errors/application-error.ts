export const APPLICATION_ERROR_CODES = [
  'UNSUPPORTED_URL',
  'ALREADY_IN_INBOX',
  'PAGE_NOT_FOUND',
  'INBOX_ITEM_NOT_FOUND',
  'READING_ENTRY_NOT_FOUND',
  'REFLECTION_REQUIRED',
  'PERMISSION_DENIED',
  'INVALID_BACKUP',
  'UNSUPPORTED_BACKUP_VERSION',
  'STORAGE_FAILURE',
  'INVALID_INPUT',
  'URL_TOO_LONG',
  'REFLECTION_TOO_LONG',
  'DISMISSAL_REASON_TOO_LONG',
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApplicationError';
    this.code = code;
  }
}
