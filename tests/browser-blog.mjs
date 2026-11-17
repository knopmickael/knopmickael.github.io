/* Execute with Playwright against node tests/serve-cms.mjs on port 4175.
 * OAuth/model responses below are explicitly simulated. No real login or AI call.
 */
async (page) => {
  const origin = new URL(page.url()).origin;
  const siteOrigin = 'http://127.0.0.1:4176';
  if (new URL(origin).port !== '4175') throw new Error('Use o CMS isolado na porta 4175.');
  const checks = [];
  const initialContent = (await (await page.request.get(`${origin}/api/content`)).json()).content;
  const initialDrafts = initialContent.posts.filter(post => post.status === 'draft').length;
  const assert = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
  const save = async () => {
    await page.getByRole('button', { name: 'Salvar no JSON', exact: true }).click();
    await page.getByText('JSON sincronizado · tudo salvo no disco', { exact: true }).waitFor();
  };
  let connected = false, pending = false, generationError = true, generations = 0;
  const suggestion = { slug: 'sugestao-ia-teste', title: 'Sugestão da IA · teste', excerpt: 'Um exemplo editorial simulado.', body: '## Uma sugestão\n\nExemplo hipotético para revisão.', date: '2026-11-16', tags: ['IA'], status: 'draft' };
  await page.context().route('https://example.com/oauth-blog-test', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>Autorização simulada para teste</h1><a href="/oauth-blog-test/complete">Concluir autorização simulada</a>' }));
  await page.context().route('https://example.com/oauth-blog-test/complete', route => route.fulfill({ status: 303, headers: { Location: `${origin}/cms/?view=blog&oauth=connected` }, body: '' }));
  await page.route('**/api/blog/ai/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1);
    let body = {}, status = 200;
    if (path === 'status') body = { connected, pending, label: connected ? 'Editor de teste' : '', model: '' };
    if (path === 'connect') { pending = true; body = { url: 'https://example.com/oauth-blog-test' }; }
    if (path === 'models') body = { models: [{ id: 'test-model', name: 'Modelo de teste' }] };
    if (path === 'suggest') {
      generations++;
      await new Promise(resolve => setTimeout(resolve, 200));
      if (generationError) { status = 409; body = { error: 'Cota de teste indisponível. Tente novamente.' }; }
      else body = { post: suggestion };
    }
    if (path === 'disconnect') { connected = false; body = { message: 'Conexão removida.' }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/cms/?view=blog`);
  await page.getByRole('heading', { name: 'Blog', exact: true }).waitFor();
  assert((await page.request.get(`${origin}/`, { maxRedirects: 0 })).status() === 303, 'Raiz do CMS redireciona ao painel');
  assert((await page.request.get(`${origin}/portfolio.json`)).status() === 404, 'CMS não serve o conteúdo público do site');
  assert(await page.getByRole('link', { name: 'Abrir site ↗', exact: true }).getAttribute('href') === 'http://127.0.0.1:4173/', 'Link do site aponta para o servidor de desenvolvimento separado');
  await page.getByText('ChatGPT não conectado', { exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Sugerir artigo com IA', exact: true }).isDisabled(), 'Geração exige conexão OAuth');
  const snapshot = await page.locator('main').ariaSnapshot();
  assert(snapshot.includes('Modelo do ChatGPT') && snapshot.includes('Novo artigo'), 'Campos e ações do blog têm nomes acessíveis');
  await page.getByRole('button', { name: '+ Novo artigo', exact: true }).click();
  await page.getByRole('button', { name: 'Aplicar artigo', exact: true }).click();
  assert(await page.getByLabel('Título do artigo', { exact: true }).evaluate(input => !input.validity.valid), 'Editor valida campos obrigatórios');
  await page.getByLabel('Título do artigo', { exact: true }).fill('Artigo de regressão · Blog');
  await page.getByLabel('Identificador / link', { exact: true }).fill('artigo-regressao-blog');
  await page.getByLabel('Resumo', { exact: true }).fill('Uma reflexão técnica criada no navegador.');
  await page.getByLabel('Tags', { exact: true }).fill('Arquitetura, Integrações');
  await page.getByLabel('Conteúdo do artigo', { exact: true }).fill('## Uma decisão\n\nUm exemplo hipotético. <img src=x onerror=alert(1)>\n\n- Entrega\n- Idempotência\n\n```js\nconst exemplo = "' + 'x'.repeat(180) + '";\n```');
  await page.getByText('Prévia de leitura', { exact: true }).click();
  assert(await page.locator('.post-preview .article-body h4').textContent() === 'Uma decisão', 'Prévia apresenta os títulos do artigo');
  assert(await page.locator('.post-preview img').count() === 0, 'HTML no artigo permanece texto, inclusive na prévia');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.getByRole('dialog').evaluate(node => node.scrollWidth === node.clientWidth), 'Editor e prévia sem overflow em 390 px');
  await page.getByRole('button', { name: 'Aplicar artigo', exact: true }).click();
  await save();
  const draft = await (await page.request.get(`${siteOrigin}/portfolio.json`)).json();
  assert(!draft.posts.some(post => post.slug === 'artigo-regressao-blog'), 'Rascunho não aparece no JSON público');
  const draftPage = await page.context().newPage();
  await draftPage.goto(`${siteOrigin}/blog.html?artigo=artigo-regressao-blog`);
  await draftPage.getByRole('heading', { level: 1, name: initialContent.blog.notFoundTitle, exact: true }).waitFor();
  assert(await draftPage.locator('.article-body').count() === 0, 'Link direto para rascunho não revela o conteúdo');
  await draftPage.close();
  await page.getByRole('button', { name: 'Editar artigo: Artigo de regressão · Blog', exact: true }).click();
  await page.getByLabel('Estado de publicação', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Aplicar artigo', exact: true }).click(); await save();
  await page.goto(`${siteOrigin}/#artigo-artigo-regressao-blog`);
  await page.getByRole('heading', { level: 1, name: 'Artigo de regressão · Blog', exact: true }).waitFor();
  assert(new URL(page.url()).pathname === '/blog.html' && new URL(page.url()).searchParams.get('artigo') === 'artigo-regressao-blog', 'Link antigo redireciona para a página de leitura');
  assert(await page.locator('.hero').count() === 0 && await page.locator('.article-body h2').textContent() === 'Uma decisão', 'Leitura tem página e hierarquia de títulos próprias');
  assert(await page.locator('.article-body img').count() === 0, 'Artigo público não executa HTML fornecido no texto');
  assert((await page.title()).includes('Artigo de regressão · Blog'), 'Título do navegador identifica o artigo');
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Artigo de regressão · Blog', exact: true }).waitFor();
  assert(await page.locator('.article-body').isVisible(), 'Recarregar preserva o artigo da URL');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Blog público sem overflow em ${width} px`);
  }
  const backToBlog = page.getByRole('link', { name: initialContent.blog.backLabel, exact: true }).first();
  await backToBlog.focus(); await page.keyboard.press('Enter');
  await page.locator('#blog-page-title').waitFor();
  assert(new URL(page.url()).pathname === '/blog.html' && !new URL(page.url()).search, 'Voltar ao blog por teclado abre a listagem');
  assert(await page.locator('.navigation a[href="./blog.html"]').getAttribute('aria-current') === 'page', 'Navegação identifica a página do blog');
  const postLink = page.locator('.blog-card').filter({ has: page.getByRole('heading', { name: 'Artigo de regressão · Blog', exact: true }) });
  await postLink.focus(); await page.keyboard.press('Enter');
  await page.locator('#article-title').waitFor();
  assert(new URL(page.url()).searchParams.get('artigo') === 'artigo-regressao-blog', 'Card abre a página do artigo por teclado');
  await page.goBack(); await page.locator('#blog-page-title').waitFor();
  await page.goForward(); await page.locator('#article-title').waitFor();
  assert(await page.locator('.article-body').isVisible(), 'Histórico do navegador funciona entre lista e leitura');
  await page.getByRole('button', { name: 'Ativar tema claro', exact: true }).click();
  assert(await page.locator('html').getAttribute('data-theme') === 'light', 'Leitura acompanha o tema claro');
  await page.getByRole('link', { name: initialContent.header.homeLabel, exact: true }).click();
  await page.locator('.hero').waitFor();
  assert(await page.locator('#blog .blog-card').count() <= 3 && await page.getByRole('link', { name: initialContent.blog.allLabel, exact: true }).getAttribute('href') === './blog.html', 'Portfólio mostra um resumo e link para todos os artigos');
  await page.getByRole('link', { name: initialContent.blog.allLabel, exact: true }).click();
  await page.locator('#blog-page-title').waitFor();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Listagem do blog sem overflow em ${width} px`);
  }
  await page.goto(`${siteOrigin}/blog.html?artigo=inexistente`);
  await page.getByRole('heading', { level: 1, name: initialContent.blog.notFoundTitle, exact: true }).waitFor();
  assert(await page.getByRole('link', { name: initialContent.blog.backLabel, exact: true }).isVisible(), 'Artigo inexistente oferece retorno ao blog');
  await page.goto(`${origin}/cms/?view=blog`);
  await page.getByText('ChatGPT não conectado', { exact: true }).waitFor();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with ChatGPT ↗', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForURL('https://example.com/oauth-blog-test');
  assert(await popup.evaluate(() => window.opener === null), 'OAuth abre em outra aba sem acesso à aba do CMS');
  connected = true; pending = false;
  const [returned] = await Promise.all([
    popup.waitForResponse(response => response.url() === `${origin}/cms/?view=blog&oauth=connected`),
    popup.getByRole('link', { name: 'Concluir autorização simulada', exact: true }).click()
  ]);
  assert((await returned.request().allHeaders())['sec-fetch-site'] === 'cross-site', 'Retorno do provedor reproduz Fetch Metadata cross-site real do navegador');
  assert(returned.status() === 200, 'Redirecionamento OAuth retorna ao CMS sem erro de origem');
  await popup.getByRole('heading', { name: 'Blog', exact: true }).waitFor();
  assert(await popup.getByRole('button', { name: '+ Novo artigo', exact: true }).isVisible(), 'Painel carrega scripts e APIs após o retorno cross-site');
  await popup.close();
  await page.getByText('Conectado · Editor de teste', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Atualizar modelos', exact: true }).click();
  await page.getByText('Modelos atualizados.', { exact: true }).waitFor();
  await page.getByLabel('Modelo do ChatGPT', { exact: true }).selectOption('test-model');
  await page.getByLabel('Tema ou direção editorial (opcional)', { exact: true }).fill('Integrações e filas');
  await page.getByRole('button', { name: 'Sugerir artigo com IA', exact: true }).click();
  await page.getByText('Cota de teste indisponível. Tente novamente.', { exact: true }).waitFor();
  assert(!await page.locator('#editor').isVisible(), 'Erro da IA não cria artigo nem abre editor vazio');
  generationError = false;
  await page.getByRole('button', { name: 'Sugerir artigo com IA', exact: true }).click();
  await page.getByRole('heading', { name: 'Revisar sugestão da IA', exact: true }).waitFor();
  assert(await page.getByLabel('Estado de publicação', { exact: true }).inputValue() === 'draft', 'Sugestão começa como rascunho para revisão');
  assert(generations === 2, 'Retry da geração acontece por ação explícita');
  await page.getByLabel('Título do artigo', { exact: true }).fill('Sugestão revisada');
  await page.getByRole('button', { name: 'Aplicar artigo', exact: true }).click(); await save();
  await page.getByLabel('Estado', { exact: true }).selectOption('draft');
  assert(await page.locator('.post-row').count() === initialDrafts + 1, 'Filtro distingue rascunhos e publicados');
  await page.getByLabel('Buscar artigos', { exact: true }).fill('sem-correspondencia');
  await page.getByText('Nenhum artigo corresponde à busca.', { exact: true }).waitFor();
  await page.getByLabel('Buscar artigos', { exact: true }).fill('');
  await page.getByLabel('Estado', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: 'Editar artigo: Sugestão revisada', exact: true }).click();
  await page.getByLabel('Identificador / link', { exact: true }).fill('artigo-regressao-blog');
  await page.getByRole('button', { name: 'Aplicar artigo', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Duplicate post slug' }).waitFor();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Painel do blog e assistente sem overflow em 390 px');
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click();
  await page.getByText('Conexão removida.', { exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Sugerir artigo com IA', exact: true }).isDisabled(), 'Desconectar bloqueia novas gerações');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remover artigo: Sugestão revisada', exact: true }).click(); await save();
  assert(await page.locator('.post-row').count() === initialContent.posts.length + 1, 'Remoção de artigo é persistida');
  await page.unroute('**/api/blog/ai/**');
  await page.context().unroute('https://example.com/oauth-blog-test');
  await page.context().unroute('https://example.com/oauth-blog-test/complete');
  return { passed: checks.length, checks };
};
