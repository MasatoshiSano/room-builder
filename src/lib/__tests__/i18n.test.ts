import { describe, expect, it, beforeEach } from 'vitest';
import { getLocale, setLocale, t } from '../i18n';

beforeEach(() => {
  setLocale('ja');
});

describe('i18n', () => {
  it('returns the JP value by default', () => {
    expect(t('app.title')).toBe('Room Builder');
    expect(t('header.mode.plan')).toBe('2D 間取り');
  });

  it('switches to EN when locale changed', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('header.mode.plan')).toBe('2D Floor');
  });

  it('falls back to JP if EN dict is missing a key', () => {
    setLocale('en');
    // Inject a key only in JP fallback
    expect(t('panel.empty.furniture')).toBeTruthy();
  });

  it('returns the key when both dicts are missing it', () => {
    expect(t('truly.unknown.key.zzz')).toBe('truly.unknown.key.zzz');
  });

  it('substitutes variables', () => {
    expect(
      t('confirm.deleteFurnitureMany', { n: 5 }),
    ).toContain('5');
    setLocale('en');
    expect(t('plans.imported', { added: 3, skipped: 1 })).toBe(
      'Imported: 3 added / 1 skipped',
    );
  });

  it('keeps unmatched variables as-is', () => {
    setLocale('ja');
    expect(t('confirm.deleteFurnitureMany', {})).toContain('{n}');
  });
});
