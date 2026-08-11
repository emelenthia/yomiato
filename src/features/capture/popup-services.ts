import type {
  CapturePageToInbox,
  GetPageStatus,
} from '../../application/use-cases';
import type { BrowserGateway } from '../../infrastructure/browser';

export interface PopupServices {
  browser: Pick<BrowserGateway, 'getActiveTab' | 'openDashboard'>;
  capturePageToInbox: Pick<CapturePageToInbox, 'execute'>;
  getPageStatus: Pick<GetPageStatus, 'execute'>;
}
