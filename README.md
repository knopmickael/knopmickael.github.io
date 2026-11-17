# Mickael Knop · Portfólio

Um portfólio estático com direção visual editorial, temas claro/escuro, carrossel de projetos, blog em página própria e conteúdo editável em [`portfolio.json`](./portfolio.json). Inclui um **CMS local** com sugestões editoriais via **OAuth ChatGPT**, seguindo a estratégia do `linkedin-post-publisher`. A interface usa HTML, CSS e JavaScript nativos; o servidor local usa `jose` para validar os tokens OIDC.

## Rodar localmente

Requer **Node.js 22 ou superior**.

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:4173**. Atualize a página depois de editar os arquivos; o servidor sempre entrega a versão atual. Execute `npm ci` na primeira utilização e após mudanças no lockfile.

```sh
npm run check                 # Sintaxe, validação do JSON e testes de comportamento
npm run build                 # Gera somente os arquivos públicos em dist/
npm run preview               # Serve o build em http://127.0.0.1:4173
```

Porta, interface e subdiretório podem ser configurados:

```sh
npm run dev -- --port 3000
npm run preview -- --port 4174 --base /portfolio/
```

O servidor também aceita `PORT` e `HOST`. Abrir `index.html` diretamente com `file://` não funciona, pois o navegador precisa buscar o JSON por HTTP.

## CMS local

```sh
npm run cms
```

- **Painel:** http://127.0.0.1:4180/cms/
- **Raiz da porta 4180:** redireciona para o painel.
- Para escolher uma porta: `npm run cms -- --port 4181`.

`npm run cms` inicia **somente o CMS**, suas APIs e os arquivos necessários ao editor e às prévias de imagem. Ele escuta exclusivamente em `127.0.0.1`. Use o endereço exato exibido no terminal.

Para visualizar o portfólio, execute **`npm run dev` em outro terminal** e abra **http://127.0.0.1:4173/**. O link **Abrir site** aponta para essa porta padrão; iniciar o CMS não inicia o servidor do site. Se usar uma porta personalizada para o site, abra o endereço correspondente manualmente. Ambos leem o mesmo `portfolio.json`: salve no CMS e atualize a aba do site.

### Fluxo de edição

1. Ao abrir, o CMS lê o `portfolio.json` do disco e preenche os formulários com os dados atuais.
2. Em **Projetos**, crie, edite, remova, busque e reordene os itens. Os campos incluem descrição, tecnologias, blocos de detalhes, visibilidade do código, URL do repositório e URL do site/demo.
3. **Aplicar projeto** atualiza o rascunho do painel.
4. **Salvar no JSON** valida e grava o rascunho no `portfolio.json`. Atualize a aba do site para visualizar.
5. Em **Conteúdo do site**, escolha uma seção. Os formulários são gerados a partir dos valores e tipos atuais do JSON; listas permitem adicionar, remover e ordenar itens. As mudanças nesses campos atualizam diretamente o rascunho.

O painel avisa sobre alterações não salvas. **Exportar rascunho** baixa uma cópia JSON; **Recarregar** descarta o rascunho e relê o arquivo. Uma mudança no arquivo por outra aba ou editor bloqueia a gravação com conflito: exporte suas alterações, recarregue e reaplique o necessário.

Antes de cada gravação, a versão anterior é copiada para **`.cms/portfolio.backup.json`**. A gravação do conteúdo usa arquivo temporário e renomeação. O backup é local e fica fora do Git e da publicação.

### Ordem dos projetos

Use as setas **↑ / ↓** na lista do CMS para definir a sequência e clique em **Salvar no JSON**. O portfólio exibe todos os projetos exatamente nessa ordem, conforme o array `projects`, sem agrupamento ou filtros de categoria. A busca do CMS ajuda a localizar projetos e preserva a sequência dos resultados.

### Galerias e capa do projeto

Cada projeto pode usar:

| Apresentação | Comportamento |
| --- | --- |
| **Galeria** | Aceita várias imagens PNG, JPEG e WebP, de até 8 MB **cada**, incluindo formatos wide e mobile. Cada imagem tem prévia e texto alternativo obrigatório. Permite adicionar, remover, reordenar e escolher uma imagem como **capa do projeto**. |
| **Visual técnico — sem screenshot** | Salva `visual.type: "repository"`. O site mostra uma capa tipográfica com o título e tecnologias, adequada a projetos sem interface visual ou deploy. |

A capa escolhida abre a galeria no card e nos detalhes. A interface mostra somente os botões **anterior/próxima** sobre a imagem, sem barra, contador ou legenda visível. A navegação também funciona por teclado (ArrowLeft/ArrowRight/Home/End) e deslize em telas de toque; a posição e o texto alternativo continuam disponíveis aos leitores de tela. Prints wide e mobile são exibidos com `object-fit: contain`, sem recorte. Remover a capa seleciona a primeira imagem restante. Galerias precisam de pelo menos uma imagem; com apenas uma, as setas ficam desativadas.

Os arquivos são copiados para `assets/projects/`, com nomes gerados, ao aplicar o projeto; os vínculos no JSON só são persistidos em **Salvar no JSON**. Imagens já enviadas são reutilizadas ao editar. Imagens antigas ou de rascunhos descartados não são apagadas automaticamente. Todas as imagens referenciadas pela galeria entram no build publicado, não apenas a capa.

As URLs de repositório e de site/demo são **opcionais e independentes**. Um projeto privado pode ter imagem e demo pública sem URL de código, ou não ter link algum. O site só cria os links preenchidos e mostra “Código privado” quando essa visibilidade é escolhida. Os links preenchidos devem usar HTTPS.

## Blog e sugestões com IA

### Escrever e publicar

1. Execute `npm run cms` e abra **http://127.0.0.1:4180/cms/?view=blog**.
2. Use **Novo artigo** para escrever manualmente ou gere uma sugestão com o assistente.
3. Edite título, identificador, resumo, data, tags e conteúdo. **Prévia de leitura** usa a mesma renderização do site.
4. Use **Aplicar artigo** para incluir o texto no rascunho do painel e **Salvar no JSON** para gravar.
5. Para exibir no site, escolha **Publicado**, aplique e salve. Para retirar um artigo, volte a **Rascunho** ou remova-o e salve.

Os artigos ficam em `posts`, no `portfolio.json`. **Somente o estado “Publicado” torna um artigo visível ao público.** Gerar com IA, aplicar o artigo e salvar um rascunho não o publica. O cabeçalho do Blog no CMS informa os totais de publicados e rascunhos. Se o site estiver vazio, confira esse estado antes de salvar novamente.

### Páginas do blog

Com `npm run dev` em execução:

| Página | Endereço |
| --- | --- |
| Lista de artigos | `http://127.0.0.1:4173/blog.html` |
| Leitura de um artigo | `http://127.0.0.1:4173/blog.html?artigo=identificador` |

A navegação **Blog** abre a página dedicada. A página inicial mostra apenas os três artigos mais recentes e o link **Todos os artigos**. A listagem exibe os publicados por data decrescente, com tags e tempo de leitura. A leitura tem título, resumo, autoria, texto completo e links para voltar ao blog e ao portfólio. A URL identifica o artigo: pode ser compartilhada, recarregada e usada com voltar/avançar do navegador. Links antigos no formato `#artigo-identificador` redirecionam para a nova página. Artigos não publicados ou inexistentes mostram uma mensagem de indisponibilidade.

São documentos HTML e links nativos com JavaScript puro, sem framework ou roteador. `blog.html` entra no build e funciona em subdiretórios do GitHub Pages sem regras de reescrita. O CMS continua separado do servidor público.

O conteúdo aceita parágrafos, títulos com `##`, listas com `-` e blocos de código entre três crases. HTML, URLs e formatação inline permanecem texto; nenhum HTML da IA é executado. A lista do CMS permite busca e filtro por estado.

**Rascunhos não entram no JSON servido ao site nem em `dist/`.** Eles continuam no `portfolio.json` de trabalho: se você versionar esse arquivo, os rascunhos também ficarão no repositório e no histórico Git. O build público contém somente artigos publicados. No GitHub Pages, publique as alterações com o mesmo fluxo do restante do portfólio.

### Autenticar no navegador

1. Em **Blog → Assistente editorial**, clique em **Continue with ChatGPT** e permita a nova aba.
2. Faça login no navegador e autorize o compartilhamento da cota, se disponível para sua conta.
3. O callback usa **`http://127.0.0.1:1455/auth/openai/callback`**. A porta 1455 precisa estar livre; encerre outro aplicativo local que a esteja usando antes de conectar.
4. Volte ao painel, clique em **Atualizar modelos** e selecione um modelo disponível para sua conta.
5. Informe um tema, ou deixe vazio para a IA escolher uma pauta, e clique em **Sugerir artigo com IA**.
6. Revise a sugestão no editor. Ela começa como **Rascunho**. Aplicar, salvar e publicar são ações do editor.

O contexto enviado contém apenas cargo/resumo do perfil, repertório técnico e títulos dos artigos salvos. O tema é opcional. Não há coleta de notícias ou pesquisa web nesse fluxo. O modelo é lembrado após uma geração bem-sucedida. Falhas de sessão, elegibilidade, cota ou resposta aparecem no painel; uma sugestão só é aceita após `response.completed` e validação do conteúdo. Não há repetição automática da geração.

O leitor de eventos aceita respostas SSE mesmo quando a integração OAuth omite o cabeçalho `Content-Type`. A conclusão e o conteúdo são verificados pelos eventos recebidos; streams interrompidos, respostas vazias ou formatos incompatíveis continuam sendo rejeitados.

A integração usa registro dinâmico, host ID persistente, PKCE S256, state de uso único com validade de dez minutos, nonce e validação de assinatura/emissor/audiência/expiração do ID token. O refresh token é renovado de forma serializada. As chamadas Responses usam o token OAuth com `store:false` e `stream:true`, como no projeto de referência. **A elegibilidade para compartilhar a cota precisa ser confirmada no login real**; assinatura Plus por si só não é uma chave de API.

As credenciais são próprias deste portfólio e ficam em **`.cms/openai.enc`**, protegidas por **Windows DPAPI CurrentUser**. Execute o CMS pelo mesmo usuário do Windows. Tokens não são enviados ao frontend, ao JSON público ou ao build. **Desconectar** remove a conexão local e tenta revogar o refresh token no provedor; o painel informa quando a revogação não puder ser confirmada. Após desconectar, uma nova conexão permite escolher outra conta.

Para desenvolvimento fora do Windows, configure `PORTFOLIO_SECRET_KEY` com 32 bytes aleatórios em base64 antes de usar OAuth; o armazenamento usa AES-256-GCM. Não versione essa chave. O site estático, o build e a edição manual não precisam de credenciais de IA.

## Personalizar o conteúdo

**O arquivo `portfolio.json`, no mesmo diretório de `index.html`, é a fonte de conteúdo.** Inclui nomes, metadados, navegação, títulos, descrições, links, textos acessíveis, mensagens de estado, ilustrações, tecnologias, experiências, contato e rodapé.

| Chave | O que editar |
| --- | --- |
| `meta` | Título, descrição, idioma, cor do navegador e tema padrão (`dark` ou `light`) |
| `ui` | Textos de botões, acessibilidade, carregamento, erro e feedback |
| `profile` | Nome, marca, apresentação, localização, links e formação |
| `navigation`, `header` | Navegação e chamada de contato |
| `hero`, `system` | Apresentação e camadas do diagrama interativo |
| `technologyStrip`, `about` | Tecnologias, biografia e destaques |
| `projectsSection`, `projects` | Apresentação da seção, projetos em ordem, links e detalhes |
| `blog`, `posts` | Apresentação do blog, artigos e estado de publicação |
| `expertise` | Grupos de competências do Repertório Técnico |
| `experience` | Histórico profissional e tecnologias utilizadas |
| `contact`, `footer` | Chamada de contato, link para copiar e rodapé |

### Adicionar um projeto

Use **Novo projeto** no CMS, ou duplique um objeto em `projects` e altere seus dados. Não há limite fixo de quatro projetos. Use um `id` único. A ordem dos objetos no array define a sequência do carrossel; o CMS atualiza a numeração ao reordenar ou remover itens.

```json
{
  "id": "meu-projeto",
  "number": "05",
  "title": "Meu projeto",
  "type": "API & INTEGRAÇÕES",
  "description": "Uma descrição objetiva da solução.",
  "tags": ["Java", "Spring Boot"],
  "url": "https://github.com/seu-usuario/seu-projeto",
  "visual": {
    "type": "repository"
  },
  "details": [
    { "title": "O desafio", "text": "Qual problema o projeto resolve." },
    { "title": "A implementação", "text": "Sua contribuição e as decisões relevantes." }
  ]
}
```

O esquema atual (`schemaVersion: 6`) inclui os textos da página dedicada em `blog` e os artigos em `posts`, usa somente `repository` e `gallery` para os visuais e não possui categorias de projetos. A capa é o índice da imagem no array, começando em zero. Por exemplo:

```json
"visual": {
  "type": "gallery",
  "cover": 1,
  "images": [
    { "src": "assets/projects/meu-projeto-wide.png", "label": "Tela inicial no desktop" },
    { "src": "assets/projects/meu-projeto-mobile.png", "label": "Tela inicial no mobile" }
  ]
}
```

Os identificadores de seção (`sobre`, `projetos`, `repertorio`, `experiencia`, `blog`, `contato`) e das camadas (`interface`, `domain`, `foundation`) são estruturais; preserve-os. Na navegação, o destino do Blog é **`./blog.html`**; as outras seções continuam usando âncoras. O validador detecta erros de navegação, IDs de projetos e artigos duplicados, galerias inválidas e links inválidos. Execute `npm run check` após editar.

### Currículo e contato

- **Baixar currículo** gera um arquivo Markdown no próprio navegador, usando os dados atuais do JSON. Não há currículo duplicado para manter.
- O contato abre o LinkedIn. O botão de copiar usa a Clipboard API e apresenta feedback de sucesso ou falha.
- Para alterar o destino, edite `profile.socials`, `contact.primarySocialId` e `contact.copyValue`.
- O tema escolhido é guardado localmente; nenhuma informação é enviada para um servidor.

## Publicar no GitHub Pages

O workflow em [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) valida, gera e publica o site a cada push para `main`.

1. Crie um repositório no GitHub e envie este projeto para a branch `main`.
2. No repositório, abra **Settings → Pages → Build and deployment**.
3. Em **Source**, selecione **GitHub Actions**.
4. Faça um push para `main`, ou execute manualmente **Publish portfolio to GitHub Pages** na aba **Actions**.
5. A URL publicada aparece no job `deploy` e em **Settings → Pages**.

Se sua branch principal tiver outro nome, ajuste `on.push.branches` no workflow.

Todos os caminhos de assets e do JSON são relativos. O mesmo build funciona em `https://usuario.github.io/` e em `https://usuario.github.io/nome-do-repositorio/`, sem configuração de base path. A navegação usa âncoras e links HTML nativos. O blog usa `blog.html` com um parâmetro de artigo e não depende de reescrita de rotas.

O artefato `dist/` usa uma lista explícita de arquivos públicos, acrescida das imagens referenciadas pelo JSON. O CMS, suas APIs, backups, a pasta `kb/`, os testes, os scripts e a documentação não são publicados no Pages. `kb/` também está no `.gitignore`, pois contém material de referência interno. Para publicar edições do CMS, envie o `portfolio.json` e as novas imagens em `assets/projects/` para a branch de publicação.

## Decisões de conteúdo

O perfil utiliza os arquivos profissionais fornecidos em `kb/`. Descrições e stacks do acervo inicial foram conferidas nos metadados e READMEs dos repositórios públicos. Os projetos sem screenshots usam visual técnico; adicione galerias pelo CMS conforme tiver imagens disponíveis. Não foram adicionadas métricas não comprovadas, certificações ou dados de clientes.

O período atual da Datainfo é consistente nas fontes. As experiências anteriores são apresentadas sem datas específicas, pois a base fornecida registra divergências cronológicas. Edite os campos `period` após confirmar as datas. O e-mail marcado como interno não foi publicado; o contato utiliza os perfis profissionais públicos.

## Acessibilidade e funcionamento

- HTML semântico, link para pular ao conteúdo e hierarquia de títulos.
- Links para navegação e botões para ações, com nomes acessíveis.
- Menu mobile com estado expandido, fechamento por Escape e gerenciamento de foco ao sair.
- Detalhes de projetos em `<dialog>` nativo, com contenção de foco, Escape e retorno ao botão de origem.
- Carrossel de projetos manual, sem autoplay, na ordem definida pelo CMS, com rolagem por toque/trackpad, setas, indicação da posição e suporte a ArrowLeft/ArrowRight/Home/End quando a região está focada.
- Histórico com `<details>` e `<summary>` acessíveis por teclado.
- Respeito a `prefers-reduced-motion`, foco visível e adaptação a telas estreitas.
- Estados de carregamento, erro do JSON com nova tentativa, acervo vazio e feedback de cópia.
- Metadados e mensagem para JavaScript desativado incorporados ao HTML pelo build a partir do JSON.

O roteiro [`tests/browser.mjs`](./tests/browser.mjs) contém regressões de menu mobile (inclusive clique no SVG), foco, diálogo, ordem dos projetos, conteúdo longo, reflow de 320 a 1440 px, estado vazio, carregamento, falha e nova tentativa. Com o servidor rodando e uma aba aberta no site, execute o arquivo pelo parâmetro `filename` de `playwright_browser_run_code_unsafe` no Playwright MCP. A instância `page` é fornecida pelo MCP; nenhuma dependência é adicionada ao site. `npm run check` executa os testes Node e verifica a sintaxe desse roteiro; os testes de navegador são executados separadamente pelo MCP.

Os testes Node de [`tests/cms.test.mjs`](./tests/cms.test.mjs) cobrem persistência, backup, conflitos, validação, proteção de origem, separação dos servidores, uploads e publicação de imagens, usando armazenamento temporário. Para testar no navegador sem alterar o JSON de trabalho, rode **`node tests/serve-cms.mjs`**: essa fixture inicia explicitamente o CMS de teste em **http://127.0.0.1:4175/cms/** e um servidor separado do site em **http://127.0.0.1:4176/**, ambos usando a mesma cópia temporária. Abra o CMS e execute [`tests/browser-cms.mjs`](./tests/browser-cms.mjs) pelo mesmo Playwright MCP. O roteiro cobre CRUD, ordenação entre CMS e landing, projeto privado, upload real, galerias com botões sobrepostos, editor de conteúdo e layout mobile. Encerre a fixture ao terminar.

[`tests/blog.test.mjs`](./tests/blog.test.mjs) cobre validação editorial, assinatura OIDC e casos negativos, PKCE/state, consentimento de cota, renovação concorrente, revogação, stream incompleto, criptografia e exclusão de rascunhos do site/build. [`tests/browser-blog.mjs`](./tests/browser-blog.mjs) pode ser executado no mesmo CMS isolado via Playwright: cobre escrita, prévia, publicação, link direto, teclado, filtros, remoção e o fluxo de sugestão com respostas OAuth/IA **simuladas**. Os testes não autenticam contas externas. A validação real exige seu login e uma geração bem-sucedida.

O site precisa de JavaScript para renderizar o portfólio. Sem JavaScript, o HTML gerado oferece os contatos públicos como alternativa. As fontes Manrope e IBM Plex Mono são carregadas do Google Fonts com `display=swap`; se o serviço estiver indisponível, as fontes de sistema assumem o layout. O site publicado é estático, sem analytics ou autenticação. Somente o CMS local tem servidor de escrita; ele restringe host/origem e exige token por sessão para alterações.

## Estrutura

```text
portfolio.json                   # Todo o conteúdo editável
index.html                       # Estrutura e entrada da aplicação
blog.html                        # Página dedicada: listagem e leitura por URL
app.js                           # Renderização e interações
styles.css                       # Tokens, componentes, temas e responsividade
lib/content.js                   # Validação, filtros e geração do currículo
lib/blog.js                      # Artigos, filtro público e renderização segura
lib/blog-page.js                 # Listagem, cards e leitura de artigos
assets/favicon.svg               # Marca do navegador
assets/projects/                 # Imagens enviadas pelo CMS (criada no primeiro upload)
cms/index.html                   # Entrada do painel local
cms/cms.js                       # Formulários, rascunho e CRUD
cms/cms.css                      # Interface do CMS
scripts/site.mjs                 # Compilação de metadados e lista pública
scripts/serve.mjs                # Servidor local, inclusive em subdiretório
scripts/build.mjs                # Build estático sem dependências
scripts/cms.mjs                  # API e servidor exclusivo para uso local
scripts/blog-ai.mjs              # OAuth ChatGPT, modelos e sugestões editoriais
scripts/secret-store.mjs         # Credenciais locais cifradas (DPAPI / AES-GCM)
package-lock.json                # Dependências reproduzíveis do CMS
tests/content.test.mjs           # Regressões de conteúdo e comportamento
tests/cms.test.mjs               # Integração da API, disco, imagens e build
tests/blog.test.mjs              # Blog, OAuth, streams, criptografia e publicação
tests/browser.mjs                # Regressões executáveis pelo Playwright MCP
tests/browser-cms.mjs            # Fluxos de edição pelo navegador
tests/browser-blog.mjs           # Blog e assistente editorial (IA simulada)
tests/serve-cms.mjs              # Cópia temporária para testes manuais/E2E
.github/workflows/pages.yml      # Publicação no GitHub Pages
```
