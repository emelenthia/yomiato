import type { SchemaVersionProvider } from '../../../domain/ports';
import type { YomiatoDatabase } from './database';

export class DexieSchemaVersionProvider implements SchemaVersionProvider {
  constructor(private readonly database: YomiatoDatabase) {}

  getSchemaVersion(): number {
    return this.database.verno;
  }
}
