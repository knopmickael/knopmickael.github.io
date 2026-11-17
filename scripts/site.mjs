import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validatePortfolio } from '../lib/content.js';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const publicFiles = ['index.html', 'blog.html', 'styles.css', 'app.js', 'portfolio.json', 'lib/content.js', 'lib/blog.js', 'lib/blog-page.js', 'assets/favicon.svg'];

export function filesForPortfolio(data) {
  return [...new Set([...publicFiles, ...data.projects.flatMap(project => project.visual.type === 'gallery' ? project.visual.images.map(image => image.src) : [])])];
}

export async function readPortfolio() {
  return validatePortfolio(JSON.parse(await readFile(resolve(projectRoot, 'portfolio.json'), 'utf8')));
}

export function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function compileHtml(template, data) {
  const boot = Object.fromEntries(['loading', 'loadErrorTitle', 'loadErrorDescription', 'retry'].map(key => [key, data.ui[key]]));
  const blogPage = template.includes('data-page="blog"');
  const meta = blogPage ? { title: `Blog · ${data.profile.name}`, description: data.blog.description } : data.meta;
  return template
    .replace(/<html[^>]*>/, `<html lang="${escapeHtml(data.meta.language)}" data-theme="${data.meta.defaultTheme === 'light' ? 'light' : 'dark'}"${blogPage ? ' data-page="blog"' : ''}>`)
    .replace('<title></title>', `<title>${escapeHtml(meta.title)}</title>`)
    .replace('<meta name="description" content="" />', `<meta name="description" content="${escapeHtml(meta.description)}" />`)
    .replace('<meta property="og:title" content="" />', `<meta property="og:title" content="${escapeHtml(meta.title)}" />`)
    .replace('<meta property="og:description" content="" />', `<meta property="og:description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta name="theme-color"[^>]*>/, `<meta name="theme-color" content="${escapeHtml(data.meta.themeColor)}" />`)
    .replace('<script id="boot-content" type="application/json">{}</script>', `<script id="boot-content" type="application/json">${JSON.stringify(boot).replaceAll('<', '\\u003c')}</script>`)
    .replace('<span id="boot-label"></span>', `<span id="boot-label">${escapeHtml(data.ui.loading)}</span>`)
    .replace('<noscript id="noscript-message"></noscript>', `<noscript id="noscript-message">${escapeHtml(data.ui.noscript)}</noscript>`);
}
