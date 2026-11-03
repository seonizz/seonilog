import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseHtml } from 'parse5';
import { parse as parseYaml } from 'yaml';
import { SITE } from '../src/config.ts';
import { isPublished, isCalendarDate } from '../src/lib/post-utils.ts';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(SITE.url).origin;
const base = `/${SITE.base.split('/').filter(Boolean).join('/')}/`.replace('//', '/');
const siteUrl = new URL(base, origin).href;

async function listFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await listFiles(resolve(directory, entry.name), `${path}/`));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}

function textContent(node) {
  return node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(textContent).join('');
}

function decodeXml(value) {
  // The generated RSS/sitemap values contain escaped text, never nested markup.
  const document = parseHtml(`<body>${value}</body>`);
  let decoded = '';
  walk(document, (node) => { if (node.tagName === 'body') decoded = textContent(node); });
  return decoded;
}

export async function verifyBuild(root = projectRoot) {
  const dist = resolve(root, 'dist');
  const files = await listFiles(dist);
  const fileSet = new Set(files);
  const errors = [];
  const fail = (message) => errors.push(message);
  const required = ['index.html', 'posts/index.html', 'about/index.html', 'search/index.html',
    'tags/index.html', '404.html', 'rss.xml', 'search-index.json', 'robots.txt', 'sitemap-index.xml'];
  for (const path of required) if (!fileSet.has(path)) fail(`필수 출력 파일이 없습니다: ${path}`);

  const html = new Map();
  for (const file of files.filter((path) => path.endsWith('.html'))) {
    const source = await readFile(resolve(dist, file), 'utf8');
    const document = parseHtml(source);
    const ids = new Set();
    const references = [];
    const meta = new Map();
    let canonical;
    let title = '';
    let h1Count = 0;
    walk(document, (node) => {
      const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
      if (attrs.id) {
        if (ids.has(attrs.id)) fail(`${file}: 중복 id '${attrs.id}'`);
        ids.add(attrs.id);
      }
      if (node.tagName === 'h1') h1Count += 1;
      if (node.tagName === 'title') title = textContent(node);
      if (node.tagName === 'meta') meta.set(attrs.name || attrs.property, attrs.content);
      if (node.tagName === 'link' && attrs.rel === 'canonical') canonical = attrs.href;
      for (const attribute of ['href', 'src', 'poster']) {
        if (attrs[attribute]) references.push(attrs[attribute]);
      }
      if (attrs.srcset && !attrs.srcset.startsWith('data:')) {
        for (const candidate of attrs.srcset.split(',')) references.push(candidate.trim().split(/\s+/)[0]);
      }
    });
    if (h1Count !== 1) fail(`${file}: 페이지의 h1은 하나여야 합니다 (현재 ${h1Count}개).`);
    if (!title || !meta.get('description')) fail(`${file}: 제목 또는 검색 설명이 없습니다.`);
    if (!canonical?.startsWith(siteUrl)) fail(`${file}: canonical URL이 블로그 주소와 다릅니다: ${canonical}`);
    if (file === '404.html' && !meta.get('robots')?.includes('noindex')) fail('404 페이지에 noindex가 없습니다.');
    html.set(file, { ids, references, meta, canonical });
  }

  const outputUrl = (file) => new URL(file.replace(/(^|\/)index\.html$/, '$1'), siteUrl);
  function verifyReference(reference, from, { checkFragment = true } = {}) {
    if (!reference || /^(data:|mailto:|tel:)/i.test(reference)) return;
    let url;
    try { url = new URL(reference, outputUrl(from)); }
    catch { fail(`${from}: 올바르지 않은 URL '${reference}'`); return; }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      fail(`${from}: 로컬 주소가 배포 파일에 포함되어 있습니다: ${reference}`);
      return;
    }
    if (!['https:', 'http:'].includes(url.protocol)) {
      fail(`${from}: 지원하지 않는 링크 형식 '${reference}'`);
      return;
    }
    if (url.origin !== origin) return; // External URLs are not fetched by this offline check.
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { fail(`${from}: URL 인코딩을 읽을 수 없습니다: ${reference}`); return; }
    if (pathname !== base.slice(0, -1) && !pathname.startsWith(base)) {
      fail(`${from}: GitHub Pages 기본 경로 ${base}가 빠졌습니다: ${reference}`);
      return;
    }
    const relative = pathname === base.slice(0, -1) ? '' : pathname.slice(base.length);
    const candidates = [relative, `${relative.replace(/\/$/, '')}${relative ? '/' : ''}index.html`, `${relative}.html`];
    const target = candidates.find((path) => fileSet.has(path));
    if (!target) {
      fail(`${from}: 연결 대상이 없습니다: ${reference}`);
      return;
    }
    if (checkFragment && url.hash && html.has(target)) {
      let fragment;
      try { fragment = decodeURIComponent(url.hash.slice(1).split(':~:')[0]); }
      catch { fail(`${from}: 앵커 인코딩을 읽을 수 없습니다: ${reference}`); return; }
      if (fragment && !html.get(target).ids.has(fragment)) fail(`${from}: 앵커가 없습니다: ${reference}`);
    }
  }

  for (const [file, page] of html) for (const reference of page.references) verifyReference(reference, file);
  for (const file of files.filter((path) => path.endsWith('.css'))) {
    const source = await readFile(resolve(dist, file), 'utf8');
    for (const match of source.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
      verifyReference(match[2], file, { checkFragment: false });
    }
  }

  const posts = [];
  const contentRoot = resolve(root, 'src/content/blog');
  for (const path of (await listFiles(contentRoot)).filter((file) => extname(file) === '.md')) {
    const source = await readFile(resolve(contentRoot, path), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatter) { fail(`${path}: frontmatter를 찾지 못했습니다.`); continue; }
    const data = parseYaml(frontmatter[1]);
    for (const key of ['pubDate', 'updatedDate']) {
      if (key === 'updatedDate' && data[key] === undefined) continue;
      if (!isCalendarDate(data[key])) fail(`${path}: ${key}는 실제로 존재하는 날짜를 YYYY-MM-DD 형식으로 적어 주세요.`);
    }
    posts.push({ ...data, draft: data.draft ?? true, pubDate: new Date(data.pubDate) });
  }
  const published = posts.filter((post) => isPublished(post));
  const expectedTitles = published.map((post) => post.title.trim()).sort();
  const articlePages = [...html.values()].filter((page) => page.meta.get('og:type') === 'article');
  const titleSuffix = ` | ${SITE.name}`;
  const actualTitles = articlePages.map((page) => {
    const title = page.meta.get('og:title') ?? '';
    return title.endsWith(titleSuffix) ? title.slice(0, -titleSuffix.length) : title;
  }).sort();
  if (JSON.stringify(actualTitles) !== JSON.stringify(expectedTitles)) fail('생성된 글 페이지가 공개 대상 글 목록과 다릅니다. 초안·미래 날짜·누락된 글을 확인해 주세요.');

  const search = JSON.parse(await readFile(resolve(dist, 'search-index.json'), 'utf8'));
  if (!Array.isArray(search)) throw new Error('검색 색인은 배열이어야 합니다.');
  if (JSON.stringify(search.map((post) => post.title).sort()) !== JSON.stringify(expectedTitles)) fail('검색 색인에 공개 대상과 다른 글이 포함되어 있습니다.');
  for (const post of search) {
    verifyReference(post.url, 'search-index.json');
    if (typeof post.body !== 'string' || typeof post.description !== 'string' || !Array.isArray(post.tags)) fail(`검색 데이터가 누락되었습니다: ${post.title}`);
  }

  const rss = await readFile(resolve(dist, 'rss.xml'), 'utf8');
  const rssTitles = [...rss.matchAll(/<item>\s*<title>([\s\S]*?)<\/title>/g)].map((match) => decodeXml(match[1])).sort();
  if (JSON.stringify(rssTitles) !== JSON.stringify(expectedTitles)) fail('RSS에 공개 대상과 다른 글이 포함되어 있습니다.');
  for (const match of rss.matchAll(/<link>([\s\S]*?)<\/link>/g)) verifyReference(decodeXml(match[1]), 'rss.xml');
  const sitemapUrls = new Set();
  for (const file of files.filter((path) => /^sitemap.*\.xml$/.test(path))) {
    const source = await readFile(resolve(dist, file), 'utf8');
    for (const match of source.matchAll(/<loc>([\s\S]*?)<\/loc>/g)) {
      const url = decodeXml(match[1]);
      if (!url.startsWith(siteUrl)) fail(`${file}: sitemap 주소가 블로그 주소와 다릅니다: ${url}`);
      verifyReference(url, file);
      sitemapUrls.add(url);
    }
  }
  for (const page of articlePages) if (!sitemapUrls.has(page.canonical)) fail(`사이트맵에 글이 없습니다: ${page.canonical}`);
  for (const [file, page] of html) {
    if (page.meta.get('robots')?.includes('noindex') && sitemapUrls.has(page.canonical)) fail(`noindex 페이지가 사이트맵에 들어 있습니다: ${file}`);
  }
  const robots = await readFile(resolve(dist, 'robots.txt'), 'utf8');
  if (!robots.includes(`Sitemap: ${siteUrl}sitemap-index.xml`)) fail('robots.txt의 사이트맵 주소가 올바르지 않습니다.');

  if (errors.length) throw new Error(`빌드 검증 실패 (${errors.length}건):\n${errors.map((message) => `- ${message}`).join('\n')}`);
  return { pages: html.size, posts: published.length, unpublished: posts.length - published.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await verifyBuild();
    console.log(`빌드 검증 완료: ${result.pages}개 페이지, ${result.posts}개 공개 글, ${result.unpublished}개 미게시 글 제외. 내부 링크·앵커·검색·RSS·사이트맵을 확인했습니다.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
