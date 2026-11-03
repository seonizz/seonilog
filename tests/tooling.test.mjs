import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { createPost, koreanDate, renderTemplate, validateSlug } from '../scripts/new-post.mjs';

const template = '---\ntitle: "{{TITLE}}"\npubDate: {{DATE}}\ndraft: true\n---\n\n## 무엇이 궁금했나요?\n';

test('post names cannot escape the content directory or use Windows device names', () => {
  for (const value of ['', '../escape', 'a/b', 'a\\b', 'file.md', '-note', 'a--b', 'Upper', 'con', 'com1', 'nul', 'lpt9', 'a'.repeat(101)]) {
    assert.throws(() => validateSlug(value), undefined, value);
  }
  assert.equal(validateSlug('my-first-note-2'), 'my-first-note-2');
});

test('generated frontmatter safely preserves Korean, quotes, backslashes, newlines and dollar signs', () => {
  const title = '"행렬": C:\\notes\n새 줄 $& {{DATE}}';
  const output = renderTemplate(template, title, new Date('2026-11-02T15:10:00Z'));
  const metadata = parse(output.split('---')[1]);
  assert.equal(metadata.title, title);
  assert.equal(metadata.pubDate, '2026-11-03');
  assert.equal(metadata.draft, true);
  assert.ok(output.endsWith('## 무엇이 궁금했나요?\n'));
});

test('authoring uses the Korean calendar date around UTC midnight', () => {
  assert.equal(koreanDate(new Date('2026-11-02T14:59:59Z')), '2026-11-02');
  assert.equal(koreanDate(new Date('2026-11-02T15:00:00Z')), '2026-11-03');
});

test('creating the same slug again does not replace the original post', async () => {
  const root = await mkdtemp(join(tmpdir(), 'seonilog-authoring-'));
  try {
    await mkdir(join(root, 'templates'));
    await writeFile(join(root, 'templates/post.md'), template);
    const path = await createPost({ root, slug: 'first-note', title: '첫 기록' });
    const original = await readFile(path, 'utf8');
    await assert.rejects(createPost({ root, slug: 'first-note', title: '덮어쓰기' }), /이미/);
    assert.equal(await readFile(path, 'utf8'), original);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
