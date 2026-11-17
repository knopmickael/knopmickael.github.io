export function validatePost(post) {
  if (!post || typeof post !== 'object') throw new Error('Artigo inválido.');
  for (const [key, limit] of [['slug', 100], ['title', 180], ['excerpt', 500], ['body', 40000]]) {
    if (typeof post[key] !== 'string' || !post[key].trim() || post[key].length > limit) throw new Error(`Preencha ${key} (até ${limit} caracteres).`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(post.slug)) throw new Error('O identificador do artigo deve usar letras minúsculas, números e hífens.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !Number.isFinite(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0, 10) !== post.date) throw new Error('Data do artigo inválida.');
  if (!['draft', 'published'].includes(post.status)) throw new Error('Estado do artigo inválido.');
  if (!Array.isArray(post.tags) || post.tags.length > 8 || post.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 50)) throw new Error('Use até 8 tags de até 50 caracteres.');
  return post;
}

export function publishedPosts(data) {
  return (data.posts || []).filter(post => post.status === 'published').sort((a, b) => b.date.localeCompare(a.date));
}

export function publicPortfolio(data) { return { ...data, posts: publishedPosts(data) }; }
export function readingMinutes(body) { return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200)); }
export function postHref(slug) { return `./blog.html?${new URLSearchParams({ artigo: slug })}`; }

export function navigationHref(href, blogPage = false) {
  if (href === '#blog') return './blog.html';
  if (blogPage && href.startsWith('#')) return href === '#inicio' ? './index.html' : `./index.html${href}`;
  return href;
}

// A deliberately small Markdown subset. Raw HTML and URLs remain text nodes;
// no model output becomes executable markup.
export function renderArticle(body, document = globalThis.document, headingLevel = 4) {
  const fragment = document.createDocumentFragment();
  const lines = body.replaceAll('\r', '').split('\n');
  let index = 0;
  const append = (tag, text) => {
    const node = document.createElement(tag);
    node.textContent = text; fragment.append(node);
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    if (line.startsWith('```')) {
      const code = []; index++;
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      index++;
      const pre = document.createElement('pre'), node = document.createElement('code');
      node.textContent = code.join('\n'); pre.append(node); fragment.append(pre);
    } else if (/^#{1,3} /.test(line)) {
      const heading = line.match(/^(#{1,3}) (.*)$/);
      append(`h${headingLevel + (heading[1].length === 3 ? 1 : 0)}`, heading[2]); index++;
    } else if (/^[-*] /.test(line)) {
      const ul = document.createElement('ul');
      while (index < lines.length && /^[-*] /.test(lines[index])) {
        const li = document.createElement('li'); li.textContent = lines[index++].slice(2); ul.append(li);
      }
      fragment.append(ul);
    } else {
      const paragraph = [line]; index++;
      while (index < lines.length && lines[index].trim() && !/^(#{1,3} |```|[-*] )/.test(lines[index])) paragraph.push(lines[index++]);
      append('p', paragraph.join('\n'));
    }
  }
  return fragment;
}
