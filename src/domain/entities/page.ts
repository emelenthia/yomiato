import type { EntityId } from '../../shared/types/ids';

export interface Page {
  id: EntityId;
  normalizedUrl: string;
  originalUrl: string;
  title: string;
  siteName: string;
  createdAt: string;
  updatedAt: string;
}
