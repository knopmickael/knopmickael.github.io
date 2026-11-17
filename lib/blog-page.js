import { publishedPosts, postHref, readingMinutes, renderArticle } from './blog.js';

export function postMeta(post, data, el) {
  return el('span', { class: 'blog-meta' },
    el('time', { datetime: post.date }, new Date(`${post.date}T12:00:00Z`).toLocaleDateString(data.meta.language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })),
    ' / ', data.blog.minutesLabel.replace('{minutes}', String(readingMinutes(post.body))));
}

export function postCard(post, index, data, { el, icon }, heading = 'h2') {
  return el('article', { class: 'blog-post' }, el('a', { class: 'blog-card', href: postHref(post.slug) },
    el('span', { class: 'blog-index', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
    el('div', { class: 'blog-card-copy' }, postMeta(post, data, el), el(heading, {}, post.title),
      el('p', { class: 'blog-excerpt' }, post.excerpt), el('div', { class: 'tags' }, post.tags.map(tag => el('span', {}, tag)))),
    el('span', { class: 'blog-read' }, data.blog.readLabel, icon('arrowUpRight'))));
}

export function emptyBlog(data, { el, icon }, heading = 'h2') {
  return el('div', { class: 'empty-state blog-empty' }, icon('code'), el(heading, {}, data.blog.emptyTitle), el('p', {}, data.blog.emptyDescription));
}

export function createBlogPage(data, helpers, search = location.search) {
  const { el, icon } = helpers;
  const posts = publishedPosts(data);
  const slug = new URLSearchParams(search).get('artigo');
  const post = posts.find(item => item.slug === slug);
  const back = (href, label) => el('a', { class: 'text-link blog-back', href }, icon('arrowRight'), label);
  const listTitle = `Blog · ${data.profile.name}`;
  if (slug !== null && !post) return {
    title: `${data.blog.notFoundTitle} · ${data.profile.name}`, description: data.blog.notFoundDescription,
    content: el('section', { class: 'blog-page container blog-not-found', 'aria-labelledby': 'blog-page-title' },
      back('./blog.html', data.blog.backLabel), el('p', { class: 'eyebrow' }, data.blog.eyebrow),
      el('h1', { id: 'blog-page-title' }, data.blog.notFoundTitle), el('p', { class: 'blog-page-description' }, data.blog.notFoundDescription))
  };
  if (!post) return {
    title: listTitle, description: data.blog.description,
    content: el('section', { class: 'blog-page container', 'aria-labelledby': 'blog-page-title' },
      back('./index.html', data.blog.backHomeLabel),
      el('div', { class: 'blog-page-heading' }, el('div', {}, el('p', { class: 'eyebrow' }, data.blog.eyebrow), el('h1', { id: 'blog-page-title' }, data.blog.title.map(line => el('span', {}, line)))), el('p', { class: 'blog-page-description' }, data.blog.description)),
      el('div', { class: 'blog-list' }, posts.length ? posts.map((post, index) => postCard(post, index, data, helpers)) : emptyBlog(data, helpers)))
  };
  return {
    title: `${post.title} · ${data.profile.name}`, description: post.excerpt, type: 'article',
    content: el('article', { class: 'blog-page reading-page container', 'aria-labelledby': 'article-title' },
      back('./blog.html', data.blog.backLabel),
      el('header', { class: 'article-heading' }, el('p', { class: 'eyebrow' }, data.blog.eyebrow), postMeta(post, data, el),
        el('h1', { id: 'article-title' }, post.title), el('p', { class: 'article-excerpt' }, post.excerpt),
        el('div', { class: 'article-byline' }, el('span', {}, data.profile.name), el('div', { class: 'tags' }, post.tags.map(tag => el('span', {}, tag))))),
      el('div', { class: 'article-body' }, renderArticle(post.body, document, 2)),
      el('footer', { class: 'article-footer' }, back('./blog.html', data.blog.backLabel), el('a', { class: 'text-link article-permalink', href: postHref(post.slug) }, data.blog.permalinkLabel, icon('arrowUpRight'))))
  };
}
