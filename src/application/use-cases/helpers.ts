import type { Page } from '../../domain/entities';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';
import { normalizeTitle } from '../../shared/utils/text';
import { parseAndNormalizeUrl } from '../../domain/values/url';
import { toUtcIsoString } from '../../shared/utils/date-time';
import type { RepositorySet } from '../../domain/ports';

export function createPageFromUrl(
  input: { url: string; title: string },
  now: string,
  id: string,
): Page {
  const parsed = parseAndNormalizeUrl(input.url);

  return {
    id,
    normalizedUrl: parsed.normalizedUrl,
    originalUrl: parsed.originalUrl,
    title: normalizeTitle(input.title, parsed.siteName),
    siteName: parsed.siteName,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getPageOrThrow(
  repositories: RepositorySet,
  pageId: string,
): Promise<Page> {
  const page = await repositories.pages.getById(pageId);

  if (!page) {
    throw new ApplicationError('PAGE_NOT_FOUND');
  }

  return page;
}

export function nowIso(dependencies: UseCaseDependencies): string {
  return toUtcIsoString(dependencies.clock.now());
}

export async function deletePageIfUnreferenced(
  repositories: RepositorySet,
  page: Page,
): Promise<Page | undefined> {
  if (await repositories.pages.isReferenced(page.id)) {
    return undefined;
  }

  await repositories.pages.deleteById(page.id);
  return page;
}

export function isConstraintError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'ConstraintError') ||
    (error instanceof Error && error.name === 'ConstraintError')
  );
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
