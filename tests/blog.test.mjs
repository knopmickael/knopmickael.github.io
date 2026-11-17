import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { once } from 'node:events';
import { generateKeyPair, SignJWT } from 'jose';
import { validatePost, publicPortfolio, readingMinutes, postHref, navigationHref } from '../lib/blog.js';
import { validatePortfolio } from '../lib/content.js';
import { createBlogAi, readEditorialStream, verifyIdentity } from '../scripts/blog-ai.mjs';
import { createSecretStore } from '../scripts/secret-store.mjs';
import { createCmsServer } from '../scripts/cms.mjs';
import { createSiteServer } from '../scripts/serve.mjs';
import { buildSite } from '../scripts/build.mjs';
import { filesForPortfolio, projectRoot } from '../scripts/site.mjs';

const source = JSON.parse(await readFile(resolve(projectRoot, 'portfolio.json'), 'utf8'));
const article = { slug: 'filas-e-integracoes', title: 'Filas e integrações', excerpt: 'Como escolher uma estratégia de integração.', body: '## Uma decisão\n\nUm exemplo hipotético.\n\n- Entrega\n- Idempotência', date: '2026-11-16', tags: ['Arquitetura'], status: 'draft' };
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const memoryStore = initial => {
  let value = structuredClone(initial || {});
  return { get: async () => structuredClone(value), put: async next => { value = structuredClone(next); } };
};
const stream = (post = article, complete = true, extra = []) => {
  const events = [{ type: 'response.output_text.delta', delta: JSON.stringify(post) }, ...extra, ...(complete ? [{ type: 'response.completed', response: { status: 'completed' } }] : [])];
  const bytes = Buffer.from(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  // Exercise boundaries inside UTF-8 codepoints and SSE delimiters.
  return new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.subarray(i, i + 7)); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });
};

test('blog validates article identities and dates, and publishes only reviewed articles in date order', () => {
  const data = structuredClone(source);
  data.posts = [article, { ...article, slug: 'publicado', status: 'published', date: '2026-11-15' }, { ...article, slug: 'novo', status: 'published' }];
  assert.equal(validatePortfolio(data), data);
  assert.deepEqual(publicPortfolio(data).posts.map(post => post.slug), ['novo', 'publicado']);
  assert.equal(data.posts.length, 3);
  assert.equal(readingMinutes('palavra '.repeat(401)), 3);
  for (const invalid of [{ slug: '../secret' }, { date: '2026-02-30' }, { date: '2026-13-01' }, { body: '' }, { status: 'scheduled' }, { tags: ['x'.repeat(51)] }, { excerpt: 'x'.repeat(501) }]) assert.throws(() => validatePost({ ...article, ...invalid }));
  data.posts.push(article);
  assert.throws(() => validatePortfolio(data), /Duplicate post slug/);
});

test('OIDC verifies signature, issuer, audience, nonce, expiration and account continuity', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const sign = (payload = {}, options = {}) => new SignJWT({ nonce: 'expected', ...payload }).setProtectedHeader({ alg: 'RS256' }).setIssuer(options.issuer || 'https://auth.openai.com').setAudience(options.audience || 'client').setSubject('user').setIssuedAt().setExpirationTime(options.expiration || '5m').sign(privateKey);
  const valid = await sign();
  assert.equal((await verifyIdentity(valid, 'client', 'expected', 'user', publicKey)).sub, 'user');
  await assert.rejects(verifyIdentity(await sign({ nonce: 'wrong' }), 'client', 'expected', 'user', publicKey));
  await assert.rejects(verifyIdentity(valid, 'client', 'expected', 'another-user', publicKey));
  for (const options of [{ issuer: 'https://untrusted.example' }, { audience: 'other' }, { expiration: '-1m' }]) await assert.rejects(verifyIdentity(await sign({}, options), 'client', 'expected', 'user', publicKey));
  const other = await generateKeyPair('RS256');
  await assert.rejects(verifyIdentity(valid, 'client', 'expected', 'user', other.publicKey));
});

test('blog article and navigation URLs preserve static hosting subdirectories', () => {
  const base = 'https://example.com/portfolio/';
  assert.equal(new URL(postHref(article.slug), base).href, `${base}blog.html?artigo=${article.slug}`);
  assert.equal(new URL(postHref(article.slug), `${base}blog.html`).href, `${base}blog.html?artigo=${article.slug}`);
  assert.equal(navigationHref('#projetos', true), './index.html#projetos');
  assert.equal(navigationHref('#inicio', true), './index.html');
  assert.equal(navigationHref('#blog'), './blog.html');
  assert.equal(navigationHref('#projetos'), '#projetos');
  assert.equal(navigationHref('./blog.html', true), './blog.html');
});

test('OAuth uses PKCE and one-use state, keeps secrets on the server, and requires quota consent', async t => {
  const store = memoryStore(); let authUrl, calls = 0;
  const ai = createBlogAi({ store, callbackPort: 0,
    verify: async (token, client, nonce) => { assert.equal(token, 'signed-token'); assert.equal(client, 'registered-client'); assert.equal(nonce, authUrl.searchParams.get('nonce')); return { sub: 'user', email: 'editor@example.com' }; },
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, 'https://auth.openai.com/api/accounts/oauth/token');
      assert.ok(options.body.get('code_verifier')); assert.equal(options.body.get('resource'), 'https://api.openai.com/v1');
      return json({ access_token: 'access-secret', refresh_token: 'refresh-secret', id_token: 'signed-token', expires_in: 3600, scope: 'openid chatgpt.tokens.use.direct' });
    }
  });
  t.after(() => ai.close());
  authUrl = new URL((await ai.start('http://127.0.0.1:4180')).url);
  assert.equal(authUrl.searchParams.get('client_id'), 'dynamic_agent_client');
  assert.equal(authUrl.searchParams.get('redirect_uri'), 'http://127.0.0.1:1455/auth/openai/callback');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(authUrl.searchParams.get('code_challenge')); assert.ok(authUrl.searchParams.get('nonce'));
  await assert.rejects(ai.callback(new URLSearchParams({ state: 'forged', code: 'code' })), /state inválido/);
  assert.equal(calls, 0);
  const params = new URLSearchParams({ state: authUrl.searchParams.get('state'), code: 'code', client_id: 'registered-client' });
  await ai.callback(params);
  assert.deepEqual(await ai.status(), { connected: true, label: 'editor@example.com', model: '', pending: false });
  assert.ok(!JSON.stringify(await ai.status()).includes('secret'));
  await assert.rejects(ai.callback(params), /state inválido/);
  assert.equal(calls, 1);
  const host = (await store.get()).host;
  authUrl = new URL((await ai.start('http://127.0.0.1:4180')).url);
  assert.equal(authUrl.searchParams.get('ext_agent_host_id'), host);
  assert.equal(authUrl.searchParams.get('client_id'), 'registered-client');
  await assert.rejects(ai.callback(new URLSearchParams({ state: authUrl.searchParams.get('state'), error: 'access_denied' })), /não concedida/);

  const deniedStore = memoryStore();
  const denied = createBlogAi({ store: deniedStore, callbackPort: 0, verify: async () => ({ sub: 'user' }), fetcher: async () => json({ access_token: 'secret', id_token: 'signed', expires_in: 3600, scope: 'openid profile' }) });
  t.after(() => denied.close());
  const start = new URL((await denied.start('http://127.0.0.1:4180')).url);
  await assert.rejects(denied.callback(new URLSearchParams({ state: start.searchParams.get('state'), code: 'code', client_id: 'new-client' })), /sem autorização/);
  assert.equal((await denied.status()).connected, false);
});

test('refresh is serialized, rotates credentials, and disconnect revokes the registered client', async () => {
  const store = memoryStore({ client: 'client', tokens: { access_token: 'old', refresh_token: 'refresh-old', expires_at: 0, scope: 'chatgpt.tokens.use.direct', label: 'Editor' } });
  let refreshes = 0, revocations = 0;
  const ai = createBlogAi({ store, fetcher: async (url, options) => {
    if (url.endsWith('/token')) { refreshes++; return json({ access_token: 'new', refresh_token: 'refresh-new', expires_in: 3600 }); }
    if (url.endsWith('/revoke')) { revocations++; assert.equal(options.body.get('client_id'), 'client'); assert.equal(options.body.get('token'), 'refresh-new'); return json({}); }
    assert.equal(options.headers.Authorization, 'Bearer new');
    return json({ models: [{ slug: 'available', display_name: 'Disponível', visibility: 'list' }, { slug: 'hidden', visibility: 'hidden' }] });
  } });
  const results = await Promise.all([ai.models(), ai.models()]);
  assert.equal(refreshes, 1);
  assert.deepEqual(results[0].models, [{ id: 'available', name: 'Disponível' }]);
  await ai.disconnect(); assert.equal(revocations, 1); assert.equal((await ai.status()).connected, false);
  await assert.rejects(ai.models(), /Conecte sua conta/);
});

test('generation accepts only completed, bounded, validated suggestions and forces draft status', async () => {
  assert.equal((await readEditorialStream(stream({ ...article, status: 'published' }))).status, 'draft');
  await assert.rejects(readEditorialStream(stream(article, false)), /interrompido/);
  await assert.rejects(readEditorialStream(stream(article, false, [{ type: 'response.failed' }])), /não concluída/);
  await assert.rejects(readEditorialStream(stream({ ...article, slug: '../escape' })), /Sugestão inválida/);
  await assert.rejects(readEditorialStream(stream({ ...article, body: 'x'.repeat(65000) })), /limite/);
  const store = memoryStore({ tokens: { access_token: 'secret', expires_at: Date.now() + 3600000 } });
  const ai = createBlogAi({ store, fetcher: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    assert.equal(request.store, false); assert.equal(request.stream, true);
    assert.ok(!JSON.stringify(request).includes('secret')); assert.ok(!JSON.stringify(request).includes('kb/'));
    return stream();
  } });
  const result = await ai.suggest({ topic: 'Integrações', model: 'available', content: source });
  assert.equal(result.post.status, 'draft'); assert.equal((await ai.status()).model, 'available');
  await assert.rejects(ai.suggest({ topic: '', model: '', content: source }), /Escolha um modelo/);
});

test('OAuth generation accepts valid SSE without Content-Type and still rejects interrupted or invalid bodies', async () => {
  const withoutType = response => { response.headers.delete('content-type'); return response; };
  const response = withoutType(stream());
  assert.equal(response.headers.get('content-type'), null);
  const result = await readEditorialStream(response);
  assert.equal(result.title, article.title);
  assert.equal(result.status, 'draft');
  await assert.rejects(readEditorialStream(withoutType(stream(article, false))), /interrompido/);
  await assert.rejects(readEditorialStream(withoutType(stream(article, false, [{ type: 'response.failed' }]))), /não concluída/);
  await assert.rejects(readEditorialStream(withoutType(new Response('<html>Gateway error</html>'))), /interrompido/);
  await assert.rejects(readEditorialStream(json({ error: { code: 'quota_exceeded' } })), /não retornou eventos/);
  await assert.rejects(readEditorialStream(new Response(null)), /vazia/);
  const store = memoryStore({ tokens: { access_token: 'secret', expires_at: Date.now() + 3600000 } });
  const ai = createBlogAi({ store, fetcher: async (url, options) => {
    assert.equal(options.headers.Accept, 'text/event-stream');
    return withoutType(stream());
  } });
  assert.equal((await ai.suggest({ topic: 'Idempotência', model: 'available', content: source })).post.title, article.title);
});

test('OAuth credentials are encrypted at rest and can be reopened by the same user', async t => {
  await mkdir(resolve(tmpdir(), 'opencode'), { recursive: true });
  const root = await mkdtemp(resolve(tmpdir(), 'opencode', 'portfolio-secret-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const previous = process.env.PORTFOLIO_SECRET_KEY;
  if (process.platform !== 'win32') process.env.PORTFOLIO_SECRET_KEY = Buffer.alloc(32, 42).toString('base64');
  t.after(() => { if (previous === undefined) delete process.env.PORTFOLIO_SECRET_KEY; else process.env.PORTFOLIO_SECRET_KEY = previous; });
  const file = resolve(root, 'credentials.enc');
  const value = { tokens: { access_token: 'never-plaintext', refresh_token: 'also-secret' } };
  const store = createSecretStore(file);
  await store.put(value);
  const disk = await readFile(file, 'utf8');
  assert.ok(!disk.includes('never-plaintext')); assert.ok(!disk.includes('also-secret'));
  assert.deepEqual(await createSecretStore(file).get(), value);
  await store.put({ host: 'host' });
  assert.deepEqual(await createSecretStore(file).get(), { host: 'host' });
});

test('CMS protects AI operations and excludes drafts from HTTP and the actual build', async t => {
  await mkdir(resolve(tmpdir(), 'opencode'), { recursive: true });
  const root = await mkdtemp(resolve(tmpdir(), 'opencode', 'portfolio-blog-'));
  const data = { ...source, posts: [article, { ...article, slug: 'publicado', status: 'published' }] };
  for (const file of filesForPortfolio(data)) {
    await mkdir(dirname(resolve(root, file)), { recursive: true });
    await copyFile(resolve(projectRoot, file), resolve(root, file));
  }
  await writeFile(resolve(root, 'portfolio.json'), JSON.stringify(data));
  let generations = 0;
  const server = createCmsServer({ root, blogAi: { status: async () => ({ connected: true }), suggest: async input => { generations++; assert.equal(input.content.profile.name, source.profile.name); return { post: article }; }, close: async () => {} } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const site = createSiteServer({ root });
  site.listen(0, '127.0.0.1'); await once(site, 'listening');
  t.after(async () => { await Promise.all([server, site].map(server => new Promise(resolve => server.close(resolve)))); await rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const siteOrigin = `http://127.0.0.1:${site.address().port}`;
  const session = await (await fetch(`${origin}/api/content`)).json();
  const suggest = headers => fetch(`${origin}/api/blog/ai/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ topic: '', model: 'available' }) });
  assert.equal((await suggest({ Origin: origin })).status, 403);
  assert.equal((await suggest({ Origin: 'https://untrusted.example', 'X-CMS-Token': session.token })).status, 403);
  assert.equal(generations, 0);
  assert.equal((await suggest({ Origin: origin, 'X-CMS-Token': session.token })).status, 200); assert.equal(generations, 1);
  assert.equal(session.content.posts.length, 2);
  assert.equal((await fetch(`${origin}/portfolio.json`)).status, 404);
  assert.deepEqual((await (await fetch(`${siteOrigin}/portfolio.json`)).json()).posts.map(post => post.slug), ['publicado']);
  assert.equal((await fetch(`${siteOrigin}/`)).status, 200);
  const blogHtml = await (await fetch(`${siteOrigin}/blog.html?artigo=publicado`)).text();
  assert.match(blogHtml, /data-page="blog"/);
  assert.ok(blogHtml.includes(`<title>Blog · ${source.profile.name}</title>`));
  assert.equal((await fetch(`${siteOrigin}/cms/`)).status, 404);
  assert.equal((await fetch(`${siteOrigin}/api/content`)).status, 404);
  assert.equal((await fetch(`${origin}/.cms/openai.enc`)).status, 404);
  await buildSite({ root });
  const published = JSON.parse(await readFile(resolve(root, 'dist/portfolio.json'), 'utf8'));
  assert.deepEqual(published.posts.map(post => post.slug), ['publicado']);
  assert.match(await readFile(resolve(root, 'dist/blog.html'), 'utf8'), /data-page="blog"/);
  const preview = createSiteServer({ root, production: true, base: '/portfolio/' });
  preview.listen(0, '127.0.0.1'); await once(preview, 'listening');
  try {
    const base = `http://127.0.0.1:${preview.address().port}/portfolio/`;
    assert.equal((await fetch(`${base}blog.html?artigo=publicado`)).status, 200);
    assert.equal((await fetch(`${base}lib/blog-page.js`)).status, 200);
    assert.deepEqual((await (await fetch(`${base}portfolio.json`)).json()).posts.map(post => post.slug), ['publicado']);
  } finally { await new Promise(resolve => preview.close(resolve)); }
});
