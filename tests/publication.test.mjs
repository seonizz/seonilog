import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, isCalendarDate } from '../src/lib/post-utils.ts';
import { tagSlug } from '../src/lib/tag-slug.ts';

test('drafts are never published and future posts wait for their Korea calendar date', () => {
  const now = new Date('2026-11-02T15:01:00Z'); // November 3 in Korea
  assert.equal(isPublished({ draft: true, pubDate: new Date('2026-11-01') }, now), false);
  assert.equal(isPublished({ draft: false, pubDate: new Date('2026-11-03') }, now), true);
  assert.equal(isPublished({ draft: false, pubDate: new Date('2026-11-04') }, now), false);
});

test('technical tags use stable filesystem-safe paths without punctuation or case collisions', () => {
  const labels = ['C/C++', 'C#', '..', 'con', 'NUL', 'a\\b', 'a?b', 'A', 'a', '공학 기초'];
  const paths = labels.map(tagSlug);
  assert.equal(new Set(paths).size, labels.length);
  for (const path of paths) assert.match(path, /^t-[a-f0-9]{32}$/);
  assert.equal(tagSlug('한글'.normalize('NFD')), tagSlug('한글'));
});

test('invalid calendar dates cannot silently roll over to a different publication date', () => {
  assert.equal(isCalendarDate('2026-02-30'), false);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.equal(isCalendarDate('2026-11-03'), true);
  assert.equal(isCalendarDate('2026-13-01'), false);
  assert.equal(isCalendarDate('2026-11-03T00:00:00Z'), false);
});
