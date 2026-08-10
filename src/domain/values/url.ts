import { MAX_URL_LENGTH } from '../../shared/constants/limits';
import { ApplicationError } from '../../application/errors/application-error';

const TRACKING_PARAMETER_NAMES = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
]);

export interface SupportedUrl {
  originalUrl: string;
  normalizedUrl: string;
  siteName: string;
}

function decodeParameterName(value: string): string {
  try {
    return decodeURIComponent(value.replaceAll('+', ' ')).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function removeTrackingParameters(search: string): string {
  if (!search) {
    return '';
  }

  const retainedParameters = search
    .slice(1)
    .split('&')
    .filter((parameter) => {
      const separatorIndex = parameter.indexOf('=');
      const rawName =
        separatorIndex === -1 ? parameter : parameter.slice(0, separatorIndex);

      return !TRACKING_PARAMETER_NAMES.has(decodeParameterName(rawName));
    });

  return retainedParameters.length > 0
    ? `?${retainedParameters.join('&')}`
    : '';
}

function parseSupportedUrl(input: string): URL {
  const trimmedInput = input.trim();

  if (trimmedInput.length > MAX_URL_LENGTH) {
    throw new ApplicationError('URL_TOO_LONG');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedInput);
  } catch {
    throw new ApplicationError('UNSUPPORTED_URL');
  }

  const protocol = parsedUrl.protocol.toLowerCase();

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new ApplicationError('UNSUPPORTED_URL');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new ApplicationError('UNSUPPORTED_URL');
  }

  return parsedUrl;
}

export function normalizeUrl(input: string): string {
  const parsedUrl = parseSupportedUrl(input);
  const normalizedUrl = new URL(parsedUrl.toString());

  normalizedUrl.protocol = normalizedUrl.protocol.toLowerCase();
  normalizedUrl.hostname = normalizedUrl.hostname.toLowerCase();
  normalizedUrl.hash = '';

  if (
    normalizedUrl.pathname.length > 1 &&
    normalizedUrl.pathname.endsWith('/')
  ) {
    normalizedUrl.pathname = normalizedUrl.pathname.slice(0, -1);
  }

  normalizedUrl.search = removeTrackingParameters(normalizedUrl.search);

  return normalizedUrl.toString();
}

export function parseAndNormalizeUrl(input: string): SupportedUrl {
  const parsedUrl = parseSupportedUrl(input);

  return {
    originalUrl: input.trim(),
    normalizedUrl: normalizeUrl(input),
    siteName: parsedUrl.hostname.toLowerCase(),
  };
}

export function isSupportedUrl(input: string): boolean {
  try {
    parseSupportedUrl(input);
    return true;
  } catch (error) {
    if (error instanceof ApplicationError) {
      return false;
    }

    throw error;
  }
}
