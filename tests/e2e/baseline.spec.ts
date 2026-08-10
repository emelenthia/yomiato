import { test } from '@playwright/test';

test('工程0のE2E実行枠', async () => {
  test.skip(true, 'Chrome拡張の実操作は後続工程で追加します');
});
