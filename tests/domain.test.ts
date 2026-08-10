import { describe, expect, it } from 'vitest';
import { ApplicationError } from '../src/application/errors';
import { validateCompletion } from '../src/domain/services/completion';
import type { Clock, IdGenerator } from '../src/domain/ports';
import { normalizeUrl, parseAndNormalizeUrl } from '../src/domain/values/url';
import {
  MAX_REFLECTION_LENGTH,
  MAX_URL_LENGTH,
} from '../src/shared/constants/limits';
import {
  normalizeDismissalReason,
  normalizeTitle,
  trimText,
} from '../src/shared/utils/text';
import {
  formatDisplayDateTime,
  toUtcIsoString,
} from '../src/shared/utils/date-time';

describe('URLの正規化', () => {
  it('仕様で定めた順序でURLを正規化する', () => {
    expect(
      normalizeUrl(
        'HTTPS://Example.COM:443/path/?q=1&utm_source=newsletter#section',
      ),
    ).toBe('https://example.com/path?q=1');
  });

  it('HTTPの標準ポートと一つの末尾スラッシュを除去する', () => {
    expect(normalizeUrl('http://EXAMPLE.com:80/path/#top')).toBe(
      'http://example.com/path',
    );
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('tracking parameter以外の値と順序を保持する', () => {
    expect(
      normalizeUrl(
        'https://example.com/search?b=two&utm_ID=123&a=one&utm_source=x',
      ),
    ).toBe('https://example.com/search?b=two&a=one');
  });

  it('空のquery markerと空のquery要素を除去する', () => {
    expect(normalizeUrl('https://example.com/?')).toBe('https://example.com/');
    expect(normalizeUrl('https://example.com/?&a=1&&')).toBe(
      'https://example.com/?a=1',
    );
    expect(normalizeUrl('https://example.com/?&utm_source=x&')).toBe(
      'https://example.com/',
    );
  });

  it.each([
    'chrome://settings',
    'file:///tmp/page.html',
    'data:text/plain,x',
    'not a url',
  ])('対応外URLを拒否する: %s', (value) => {
    expect(() => normalizeUrl(value)).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_URL' }),
    );
  });

  it('認証情報を含むURLを拒否する', () => {
    expect(() =>
      normalizeUrl('https://user:password@example.com/'),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_URL' }));
  });

  it('URLの上限を超えた入力を拒否する', () => {
    const longUrl = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;

    expect(() => normalizeUrl(longUrl)).toThrowError(
      expect.objectContaining({ code: 'URL_TOO_LONG' }),
    );
  });

  it('正規化URLとサイト名をまとめて返す', () => {
    expect(parseAndNormalizeUrl('https://EXAMPLE.com/article#part')).toEqual({
      originalUrl: 'https://EXAMPLE.com/article#part',
      normalizedUrl: 'https://example.com/article',
      siteName: 'example.com',
    });
  });
});

describe('読了条件', () => {
  it('振り返りをtrimして通常の読了として返す', () => {
    expect(
      validateCompletion({ reflection: '  学んだこと  ', noTakeaway: false }),
    ).toEqual({ reflection: '学んだこと', reflectionType: 'impression' });
  });

  it('空文字、空白だけ、得るものなしの組み合わせを検証する', () => {
    expect(() =>
      validateCompletion({ reflection: '', noTakeaway: false }),
    ).toThrowError(expect.objectContaining({ code: 'REFLECTION_REQUIRED' }));
    expect(() =>
      validateCompletion({ reflection: '   ', noTakeaway: false }),
    ).toThrowError(expect.objectContaining({ code: 'REFLECTION_REQUIRED' }));
    expect(validateCompletion({ reflection: '', noTakeaway: true })).toEqual({
      reflection: '',
      reflectionType: 'none',
    });
    expect(validateCompletion({ reflection: '   ', noTakeaway: true })).toEqual(
      {
        reflection: '',
        reflectionType: 'none',
      },
    );
  });

  it('reflectionの上限を超えた入力を拒否する', () => {
    expect(() =>
      validateCompletion({
        reflection: 'a'.repeat(MAX_REFLECTION_LENGTH + 1),
        noTakeaway: false,
      }),
    ).toThrowError(expect.objectContaining({ code: 'REFLECTION_TOO_LONG' }));
  });

  it('得るものなしを選んだ場合は入力中の長いreflectionを保存しない', () => {
    expect(
      validateCompletion({
        reflection: 'a'.repeat(MAX_REFLECTION_LENGTH + 1),
        noTakeaway: true,
      }),
    ).toEqual({ reflection: '', reflectionType: 'none' });
  });
});

describe('共通値とポート', () => {
  it('文字列trimとタイトル・断念理由の制約を適用する', () => {
    expect(trimText('  text  ')).toBe('text');
    expect(normalizeTitle('  ', ' example.com ')).toBe('example.com');
    expect(normalizeTitle('a'.repeat(2_000), 'fallback')).toHaveLength(1_000);
    expect(normalizeTitle(`${'a'.repeat(999)}😀b`, 'fallback')).toBe(
      `${'a'.repeat(999)}😀`,
    );
    expect(normalizeDismissalReason('  理由  ')).toBe('理由');
    expect(() => normalizeDismissalReason('a'.repeat(1_001))).toThrowError(
      expect.objectContaining({ code: 'DISMISSAL_REASON_TOO_LONG' }),
    );
  });

  it('UTC保存日時とローカル表示日時を共通関数で扱う', () => {
    const date = new Date('2026-08-10T00:00:00.000Z');

    expect(toUtcIsoString(date)).toBe('2026-08-10T00:00:00.000Z');
    expect(formatDisplayDateTime(date)).toContain('2026');
    expect(() => toUtcIsoString(new Date('invalid'))).toThrowError(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });

  it('ClockとIdGeneratorを固定実装へ差し替えられる', () => {
    const fixedDate = new Date('2026-08-10T00:00:00.000Z');
    const clock: Clock = { now: () => fixedDate };
    const idGenerator: IdGenerator = { generate: () => 'fixed-id' };

    expect(clock.now()).toBe(fixedDate);
    expect(idGenerator.generate()).toBe('fixed-id');
  });

  it('Application Errorが判別可能なコードを持つ', () => {
    const error = new ApplicationError('PAGE_NOT_FOUND');

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('PAGE_NOT_FOUND');
  });
});
