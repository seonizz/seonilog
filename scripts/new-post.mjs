import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function validateSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '') || slug.length > 100) {
    throw new Error('파일 이름은 영문 소문자·숫자·하이픈(-)으로 100자 이내로 적어 주세요. 예: my-first-note');
  }
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(slug)) {
    throw new Error('이 파일 이름은 Windows에서 사용할 수 없습니다. 다른 이름을 적어 주세요.');
  }
  return slug;
}

export function koreanDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function renderTemplate(template, title, now = new Date()) {
  if (!title?.trim()) throw new Error('글 제목을 적어 주세요.');
  if (!/^title: "\{\{TITLE\}\}"$/m.test(template) || !/^pubDate: \{\{DATE\}\}$/m.test(template)) {
    throw new Error('templates/post.md에서 제목 또는 날짜 자리표시자를 찾지 못했습니다.');
  }
  return template
    .replace(/^pubDate: \{\{DATE\}\}$/m, () => `pubDate: ${koreanDate(now)}`)
    .replace(/^title: "\{\{TITLE\}\}"$/m, () => `title: ${JSON.stringify(title.trim())}`);
}

export async function createPost({ slug, title, root = projectRoot, now = new Date() }) {
  validateSlug(slug);
  const template = await readFile(resolve(root, 'templates/post.md'), 'utf8');
  const content = renderTemplate(template, title, now);
  const destination = resolve(root, 'src/content/blog', `${slug}.md`);
  await mkdir(dirname(destination), { recursive: true });
  try {
    // Exclusive creation protects an existing post even if two commands run together.
    await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`이미 ${slug}.md 글이 있습니다. 다른 파일 이름을 적어 주세요.`);
    throw error;
  }
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [slug, ...titleParts] = process.argv.slice(2);
  if (slug === '--help' || slug === '-h') {
    console.log('사용법: npm run new:post -- my-first-note "처음 이해한 개념"');
    console.log('초안(draft: true)으로 생성됩니다. 작성 후 draft: false로 바꾸면 다음 배포에 공개됩니다.');
  } else {
    try {
      const path = await createPost({ slug, title: titleParts.join(' ') });
      console.log(`초안이 만들어졌습니다: ${path}`);
      console.log('npm run dev로 확인하고, 공개할 때 draft: false로 바꿔 주세요.');
    } catch (error) {
      console.error(error.message);
      console.error('사용법: npm run new:post -- my-first-note "처음 이해한 개념"');
      process.exitCode = 1;
    }
  }
}
