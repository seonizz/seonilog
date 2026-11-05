type SearchEntry = {
  title: string;
  description: string;
  tags: string[];
  body: string;
  url: string;
  pubDate: string;
};

const root = document.querySelector<HTMLElement>('[data-search]');

if (root) {
  const form = root.querySelector<HTMLFormElement>('[data-search-form]')!;
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')!;
  const status = root.querySelector<HTMLElement>('[data-search-status]')!;
  const results = root.querySelector<HTMLUListElement>('[data-search-results]')!;
  const indexUrl = root.dataset.indexUrl!;
  let entries: SearchEntry[] | undefined;
  let loading: Promise<SearchEntry[]> | undefined;
  let revision = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ko-KR');

  async function getIndex() {
    if (entries) return entries;
    loading ??= fetch(indexUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error('Search index unavailable');
        const data: SearchEntry[] = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid search index');
        entries = data;
        return data;
      })
      .catch((error) => {
        loading = undefined;
        throw error;
      });
    return loading;
  }

  function renderResult(entry: SearchEntry) {
    const item = document.createElement('li');
    const article = document.createElement('article');
    article.className = 'post-summary';
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = entry.url;
    link.textContent = entry.title;
    heading.append(link);
    const metadata = document.createElement('p');
    metadata.className = 'post-meta';
    const date = document.createElement('time');
    date.dateTime = entry.pubDate;
    date.textContent = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(new Date(entry.pubDate));
    metadata.append(date);
    article.append(heading, metadata);
    item.append(article);
    return item;
  }

  async function search() {
    const currentRevision = ++revision;
    const query = input.value.trim();
    results.replaceChildren();
    if (!query) {
      status.textContent = '';
      results.removeAttribute('aria-busy');
      return;
    }
    status.textContent = '검색 중…';
    results.setAttribute('aria-busy', 'true');
    try {
      const data = await getIndex();
      if (currentRevision !== revision) return;
      const terms = normalize(query).split(/\s+/).filter(Boolean);
      const matches = data.filter((entry) => {
        const text = normalize([entry.title, entry.description, ...entry.tags, entry.body].join(' '));
        return terms.every((term) => text.includes(term));
      });
      results.replaceChildren(...matches.map(renderResult));
      status.textContent = matches.length
        ? `${matches.length}개`
        : '검색 결과가 없습니다.';
    } catch {
      if (currentRevision !== revision) return;
      status.textContent = '검색 실패. 다시 시도해 주세요.';
    } finally {
      if (currentRevision === revision) results.removeAttribute('aria-busy');
    }
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    const query = input.value.trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(debounce);
    updateUrl();
    void search();
  });
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      void search();
    }, 150);
  });
  window.addEventListener('popstate', () => {
    clearTimeout(debounce);
    input.value = new URL(window.location.href).searchParams.get('q') ?? '';
    void search();
  });
  input.value = new URL(window.location.href).searchParams.get('q') ?? '';
  void search();
}
