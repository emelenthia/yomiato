import type {
  ClearAllData,
  ExportBackup,
  GetDataSummary,
  ImportBackup,
} from '../../application/use-cases';
import type { BrowserGateway } from '../../infrastructure/browser';

export interface SettingsServices {
  browser: Pick<BrowserGateway, 'downloadJson' | 'readFile'>;
  clearAllData: Pick<ClearAllData, 'execute'>;
  exportBackup: Pick<ExportBackup, 'execute'>;
  getDataSummary: Pick<GetDataSummary, 'execute'>;
  importBackup: Pick<ImportBackup, 'execute' | 'preview'>;
}
